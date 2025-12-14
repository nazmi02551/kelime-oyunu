# models/message.py
from bson.objectid import ObjectId
from datetime import datetime

class Message:
    """
    Mesajlaşma sistemi.
    - Arkadaşlar arası özel mesajlaşma
    - Okundu bilgisi
    - Mesaj geçmişi
    """
    
    def __init__(self, db):
        self.db = db
        self.collection = db.messages
        self.conversations = db.conversations
        self.users = db.users
        self.friendships = db.friendships
    
    def _get_conversation_id(self, user1_id, user2_id):
        """İki kullanıcı arasındaki conversation ID'yi oluşturur (sıralı)."""
        ids = sorted([str(user1_id), str(user2_id)])
        return f"{ids[0]}_{ids[1]}"
    
    def _are_friends(self, user1_id, user2_id):
        """İki kullanıcının arkadaş olup olmadığını kontrol eder."""
        friendship = self.friendships.find_one({
            '$or': [
                {'from_user': ObjectId(user1_id), 'to_user': ObjectId(user2_id)},
                {'from_user': ObjectId(user2_id), 'to_user': ObjectId(user1_id)}
            ],
            'status': 'accepted'
        })
        return friendship is not None
    
    def send_message(self, from_user_id, to_user_id, content):
        """
        Mesaj gönderir.
        """
        if not content or not content.strip():
            return {'success': False, 'error': 'Mesaj boş olamaz'}
        
        if len(content) > 1000:
            return {'success': False, 'error': 'Mesaj çok uzun (max 1000 karakter)'}
        
        # Arkadaşlık kontrolü
        if not self._are_friends(from_user_id, to_user_id):
            return {'success': False, 'error': 'Sadece arkadaşlarınıza mesaj gönderebilirsiniz'}
        
        # Hedef kullanıcıyı kontrol et
        to_user = self.users.find_one({'_id': ObjectId(to_user_id)})
        if not to_user:
            return {'success': False, 'error': 'Kullanıcı bulunamadı'}
        
        conversation_id = self._get_conversation_id(from_user_id, to_user_id)
        
        # Mesajı oluştur
        message = {
            'conversation_id': conversation_id,
            'from_user': ObjectId(from_user_id),
            'to_user': ObjectId(to_user_id),
            'content': content.strip(),
            'read': False,
            'created_at': datetime.utcnow()
        }
        
        result = self.collection.insert_one(message)
        
        # Conversation'ı güncelle veya oluştur
        self.conversations.update_one(
            {'conversation_id': conversation_id},
            {
                '$set': {
                    'participants': [ObjectId(from_user_id), ObjectId(to_user_id)],
                    'last_message': content.strip()[:100],
                    'last_message_at': datetime.utcnow(),
                    'last_sender': ObjectId(from_user_id)
                },
                '$inc': {'unread_count': 1}
            },
            upsert=True
        )
        
        return {
            'success': True,
            'message_id': str(result.inserted_id),
            'message': 'Mesaj gönderildi'
        }
    
    def get_conversations(self, user_id):
        """
        Kullanıcının tüm konuşmalarını getirir.
        """
        conversations = list(self.conversations.find({
            'participants': ObjectId(user_id)
        }).sort('last_message_at', -1))
        
        result = []
        for conv in conversations:
            # Karşı tarafı bul
            other_user_id = [p for p in conv['participants'] if p != ObjectId(user_id)][0]
            other_user = self.users.find_one({'_id': other_user_id}, {'password': 0})
            
            if not other_user:
                continue
            
            # Okunmamış mesaj sayısı
            unread_count = self.collection.count_documents({
                'conversation_id': conv['conversation_id'],
                'to_user': ObjectId(user_id),
                'read': False
            })
            
            result.append({
                'conversation_id': conv['conversation_id'],
                'other_user': {
                    'user_id': str(other_user['_id']),
                    'username': other_user.get('username'),
                    'statistics': other_user.get('statistics', {})
                },
                'last_message': conv.get('last_message', ''),
                'last_message_at': conv.get('last_message_at'),
                'unread_count': unread_count,
                'is_last_sender': conv.get('last_sender') == ObjectId(user_id)
            })
        
        return result
    
    def get_messages(self, user_id, conversation_id, limit=50, before_id=None):
        """
        Bir konuşmadaki mesajları getirir.
        """
        # Kullanıcının bu konuşmaya erişim yetkisi var mı kontrol et
        conversation = self.conversations.find_one({
            'conversation_id': conversation_id,
            'participants': ObjectId(user_id)
        })
        
        if not conversation:
            return {'success': False, 'error': 'Konuşma bulunamadı'}
        
        query = {'conversation_id': conversation_id}
        
        if before_id:
            query['_id'] = {'$lt': ObjectId(before_id)}
        
        messages = list(self.collection.find(query).sort('created_at', -1).limit(limit))
        
        # Mesajları formatla
        result = []
        for msg in messages:
            result.append({
                '_id': str(msg['_id']),
                'message_id': str(msg['_id']),
                'from_user': str(msg['from_user']),
                'to_user': str(msg['to_user']),
                'content': msg['content'],
                'read': msg.get('read', False),
                'created_at': msg['created_at'].isoformat(),
                'is_mine': msg['from_user'] == ObjectId(user_id)
            })
        
        # Sıralamayı düzelt (eski -> yeni)
        result.reverse()
        
        return {'success': True, 'messages': result}
    
    def mark_as_read(self, user_id, conversation_id):
        """
        Bir konuşmadaki tüm mesajları okundu olarak işaretler.
        """
        result = self.collection.update_many(
            {
                'conversation_id': conversation_id,
                'to_user': ObjectId(user_id),
                'read': False
            },
            {'$set': {'read': True}}
        )
        
        return {
            'success': True,
            'marked_count': result.modified_count
        }
    
    def get_unread_count(self, user_id):
        """
        Kullanıcının toplam okunmamış mesaj sayısını döndürür.
        """
        count = self.collection.count_documents({
            'to_user': ObjectId(user_id),
            'read': False
        })
        
        return count
    
    def delete_message(self, user_id, message_id):
        """
        Mesajı siler (sadece gönderen silebilir).
        """
        result = self.collection.delete_one({
            '_id': ObjectId(message_id),
            'from_user': ObjectId(user_id)
        })
        
        if result.deleted_count > 0:
            return {'success': True, 'message': 'Mesaj silindi'}
        return {'success': False, 'error': 'Mesaj bulunamadı veya silme yetkiniz yok'}
