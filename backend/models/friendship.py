# models/friendship.py
from bson.objectid import ObjectId
from datetime import datetime

class Friendship:
    """
    Arkadaşlık sistemi.
    - Arkadaş ekleme/silme
    - Arkadaş istekleri
    - Online durumu
    """
    
    STATUS_PENDING = 'pending'
    STATUS_ACCEPTED = 'accepted'
    STATUS_REJECTED = 'rejected'
    STATUS_BLOCKED = 'blocked'
    
    def __init__(self, db):
        self.collection = db.friendships
        self.users = db.users
    
    def send_friend_request(self, from_user_id, to_user_id):
        """
        Arkadaşlık isteği gönderir.
        """
        if from_user_id == to_user_id:
            return {'success': False, 'error': 'Kendinize istek gönderemezsiniz'}
        
        # Hedef kullanıcıyı kontrol et
        to_user = self.users.find_one({'_id': ObjectId(to_user_id)})
        if not to_user:
            return {'success': False, 'error': 'Kullanıcı bulunamadı'}
        
        # Mevcut ilişkiyi kontrol et
        existing = self.collection.find_one({
            '$or': [
                {'from_user': ObjectId(from_user_id), 'to_user': ObjectId(to_user_id)},
                {'from_user': ObjectId(to_user_id), 'to_user': ObjectId(from_user_id)}
            ]
        })
        
        if existing:
            if existing['status'] == self.STATUS_ACCEPTED:
                return {'success': False, 'error': 'Zaten arkadaşsınız'}
            elif existing['status'] == self.STATUS_PENDING:
                return {'success': False, 'error': 'Bekleyen istek var'}
            elif existing['status'] == self.STATUS_BLOCKED:
                return {'success': False, 'error': 'Bu kullanıcıyla etkileşim kuramazsınız'}
        
        # Yeni istek oluştur
        request = {
            'from_user': ObjectId(from_user_id),
            'to_user': ObjectId(to_user_id),
            'status': self.STATUS_PENDING,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        }
        
        self.collection.insert_one(request)
        
        return {
            'success': True,
            'message': 'Arkadaşlık isteği gönderildi',
            'to_username': to_user.get('username')
        }
    
    def respond_to_request(self, user_id, request_id, accept=True):
        """
        Arkadaşlık isteğine yanıt verir.
        """
        request = self.collection.find_one({
            '_id': ObjectId(request_id),
            'to_user': ObjectId(user_id),
            'status': self.STATUS_PENDING
        })
        
        if not request:
            return {'success': False, 'error': 'İstek bulunamadı'}
        
        new_status = self.STATUS_ACCEPTED if accept else self.STATUS_REJECTED
        
        self.collection.update_one(
            {'_id': ObjectId(request_id)},
            {
                '$set': {
                    'status': new_status,
                    'updated_at': datetime.utcnow()
                }
            }
        )
        
        return {
            'success': True,
            'message': 'Arkadaşlık isteği kabul edildi' if accept else 'Arkadaşlık isteği reddedildi'
        }
    
    def remove_friend(self, user_id, friend_id):
        """
        Arkadaşlıktan çıkarır.
        """
        result = self.collection.delete_one({
            '$or': [
                {'from_user': ObjectId(user_id), 'to_user': ObjectId(friend_id)},
                {'from_user': ObjectId(friend_id), 'to_user': ObjectId(user_id)}
            ],
            'status': self.STATUS_ACCEPTED
        })
        
        if result.deleted_count > 0:
            return {'success': True, 'message': 'Arkadaşlıktan çıkarıldı'}
        return {'success': False, 'error': 'Arkadaşlık bulunamadı'}
    
    def get_friends(self, user_id):
        """
        Kullanıcının arkadaş listesini getirir.
        """
        friendships = list(self.collection.find({
            '$or': [
                {'from_user': ObjectId(user_id)},
                {'to_user': ObjectId(user_id)}
            ],
            'status': self.STATUS_ACCEPTED
        }))
        
        friends = []
        for f in friendships:
            friend_id = f['to_user'] if f['from_user'] == ObjectId(user_id) else f['from_user']
            friend = self.users.find_one({'_id': friend_id}, {'password': 0})
            if friend:
                friends.append({
                    'user_id': str(friend['_id']),
                    'username': friend.get('username'),
                    'statistics': friend.get('statistics', {}),
                    'is_online': self._is_user_online(friend),
                    'friendship_id': str(f['_id']),
                    'since': f.get('updated_at', f.get('created_at'))
                })
        
        return friends
    
    def get_pending_requests(self, user_id):
        """
        Kullanıcıya gelen bekleyen istekleri getirir.
        """
        requests = list(self.collection.find({
            'to_user': ObjectId(user_id),
            'status': self.STATUS_PENDING
        }))
        
        pending = []
        for r in requests:
            from_user = self.users.find_one({'_id': r['from_user']}, {'password': 0})
            if from_user:
                pending.append({
                    'request_id': str(r['_id']),
                    'from_user_id': str(from_user['_id']),
                    'from_username': from_user.get('username'),
                    'statistics': from_user.get('statistics', {}),
                    'created_at': r.get('created_at')
                })
        
        return pending
    
    def get_sent_requests(self, user_id):
        """
        Kullanıcının gönderdiği bekleyen istekleri getirir.
        """
        requests = list(self.collection.find({
            'from_user': ObjectId(user_id),
            'status': self.STATUS_PENDING
        }))
        
        sent = []
        for r in requests:
            to_user = self.users.find_one({'_id': r['to_user']}, {'password': 0})
            if to_user:
                sent.append({
                    'request_id': str(r['_id']),
                    'to_user_id': str(to_user['_id']),
                    'to_username': to_user.get('username'),
                    'created_at': r.get('created_at')
                })
        
        return sent
    
    def search_users(self, query, current_user_id, limit=20):
        """
        Kullanıcı araması yapar (arkadaş eklemek için).
        """
        users = list(self.users.find({
            'username': {'$regex': query, '$options': 'i'},
            '_id': {'$ne': ObjectId(current_user_id)}
        }, {'password': 0}).limit(limit))
        
        results = []
        for user in users:
            # Arkadaşlık durumunu kontrol et
            friendship_status = self._get_friendship_status(current_user_id, str(user['_id']))
            
            results.append({
                'user_id': str(user['_id']),
                'username': user.get('username'),
                'statistics': user.get('statistics', {}),
                'friendship_status': friendship_status
            })
        
        return results
    
    def _check_friendship_exists(self, user_id, other_user_id):
        """İki kullanıcının arkadaş olup olmadığını kontrol eder."""
        friendship = self.collection.find_one({
            '$or': [
                {'from_user': ObjectId(user_id), 'to_user': ObjectId(other_user_id), 'status': self.STATUS_ACCEPTED},
                {'from_user': ObjectId(other_user_id), 'to_user': ObjectId(user_id), 'status': self.STATUS_ACCEPTED}
            ]
        })
        return friendship is not None
    
    def _get_friendship_status(self, user_id, other_user_id):
        """İki kullanıcı arasındaki arkadaşlık durumunu getirir."""
        friendship = self.collection.find_one({
            '$or': [
                {'from_user': ObjectId(user_id), 'to_user': ObjectId(other_user_id)},
                {'from_user': ObjectId(other_user_id), 'to_user': ObjectId(user_id)}
            ]
        })
        
        if not friendship:
            return 'none'
        return friendship.get('status', 'none')
    
    def _is_user_online(self, user):
        """
        Kullanıcının online olup olmadığını kontrol eder.
        Son 5 dakika içinde giriş yapmışsa online sayılır.
        """
        last_login = user.get('metadata', {}).get('last_login_at')
        if not last_login:
            return False
        
        from datetime import timedelta
        return datetime.utcnow() - last_login < timedelta(minutes=5)
    
    def block_user(self, user_id, blocked_user_id):
        """Kullanıcıyı engeller."""
        # Mevcut ilişkiyi sil
        self.collection.delete_many({
            '$or': [
                {'from_user': ObjectId(user_id), 'to_user': ObjectId(blocked_user_id)},
                {'from_user': ObjectId(blocked_user_id), 'to_user': ObjectId(user_id)}
            ]
        })
        
        # Engelleme kaydı oluştur
        self.collection.insert_one({
            'from_user': ObjectId(user_id),
            'to_user': ObjectId(blocked_user_id),
            'status': self.STATUS_BLOCKED,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        })
        
        return {'success': True, 'message': 'Kullanıcı engellendi'}
