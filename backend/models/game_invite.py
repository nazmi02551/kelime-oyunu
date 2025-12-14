# models/game_invite.py
from datetime import datetime, timedelta
from bson import ObjectId

class GameInvite:
    """Oyun davet sistemi modeli."""
    
    def __init__(self, db):
        self.db = db
        self.collection = db.game_invites
        self.users = db.users
        self.friendships = db.friendships
        self.ensure_indexes()
    
    def ensure_indexes(self):
        """Gerekli index'leri oluşturur."""
        try:
            self.collection.create_index([('from_user', 1), ('to_user', 1)])
            self.collection.create_index('created_at', expireAfterSeconds=3600)  # 1 saat sonra sil
            self.collection.create_index('status')
        except Exception as e:
            print(f"⚠️  GameInvite index hatası: {e}")
    
    def _are_friends(self, user1_id, user2_id):
        """İki kullanıcının arkadaş olup olmadığını kontrol eder."""
        friendship = self.friendships.find_one({
            '$or': [
                {'user_id': ObjectId(user1_id), 'friend_id': ObjectId(user2_id), 'status': 'accepted'},
                {'user_id': ObjectId(user2_id), 'friend_id': ObjectId(user1_id), 'status': 'accepted'}
            ]
        })
        return friendship is not None
    
    def send_invite(self, from_user_id, to_user_id, game_settings=None):
        """
        Arkadaşa oyun daveti gönderir.
        game_settings: {'question_count': 10, 'category': 'genel', ...}
        """
        if from_user_id == to_user_id:
            return {'success': False, 'error': 'Kendinize davet gönderemezsiniz'}
        
        # Arkadaşlık kontrolü
        if not self._are_friends(from_user_id, to_user_id):
            return {'success': False, 'error': 'Sadece arkadaşlarınıza davet gönderebilirsiniz'}
        
        # Aktif davet kontrolü
        existing = self.collection.find_one({
            'from_user': ObjectId(from_user_id),
            'to_user': ObjectId(to_user_id),
            'status': 'pending'
        })
        
        if existing:
            return {'success': False, 'error': 'Zaten bekleyen bir davetiniz var'}
        
        # Kullanıcıları al
        from_user = self.users.find_one({'_id': ObjectId(from_user_id)})
        to_user = self.users.find_one({'_id': ObjectId(to_user_id)})
        
        if not from_user or not to_user:
            return {'success': False, 'error': 'Kullanıcı bulunamadı'}
        
        invite = {
            'from_user': ObjectId(from_user_id),
            'from_username': from_user.get('username'),
            'to_user': ObjectId(to_user_id),
            'to_username': to_user.get('username'),
            'game_settings': game_settings or {'question_count': 10},
            'status': 'pending',  # pending, accepted, declined, expired
            'created_at': datetime.utcnow(),
            'expires_at': datetime.utcnow() + timedelta(minutes=5)
        }
        
        result = self.collection.insert_one(invite)
        
        return {
            'success': True,
            'invite_id': str(result.inserted_id),
            'message': f'{to_user.get("username")} kullanıcısına davet gönderildi'
        }
    
    def get_pending_invites(self, user_id):
        """Kullanıcının bekleyen davetlerini getirir (aldığı)."""
        invites = list(self.collection.find({
            'to_user': ObjectId(user_id),
            'status': 'pending',
            'expires_at': {'$gt': datetime.utcnow()}
        }).sort('created_at', -1))
        
        result = []
        for inv in invites:
            result.append({
                'invite_id': str(inv['_id']),
                'from_user_id': str(inv['from_user']),
                'from_username': inv.get('from_username'),
                'game_settings': inv.get('game_settings', {}),
                'created_at': inv['created_at'].isoformat(),
                'expires_at': inv['expires_at'].isoformat()
            })
        
        return result
    
    def get_sent_invites(self, user_id):
        """Kullanıcının gönderdiği bekleyen davetleri getirir."""
        invites = list(self.collection.find({
            'from_user': ObjectId(user_id),
            'status': 'pending',
            'expires_at': {'$gt': datetime.utcnow()}
        }).sort('created_at', -1))
        
        result = []
        for inv in invites:
            result.append({
                'invite_id': str(inv['_id']),
                'to_user_id': str(inv['to_user']),
                'to_username': inv.get('to_username'),
                'game_settings': inv.get('game_settings', {}),
                'created_at': inv['created_at'].isoformat(),
                'expires_at': inv['expires_at'].isoformat()
            })
        
        return result
    
    def respond_to_invite(self, user_id, invite_id, accept=True):
        """Davete yanıt verir."""
        invite = self.collection.find_one({
            '_id': ObjectId(invite_id),
            'to_user': ObjectId(user_id),
            'status': 'pending'
        })
        
        if not invite:
            return {'success': False, 'error': 'Davet bulunamadı veya süresi dolmuş'}
        
        if invite['expires_at'] < datetime.utcnow():
            self.collection.update_one(
                {'_id': ObjectId(invite_id)},
                {'$set': {'status': 'expired'}}
            )
            return {'success': False, 'error': 'Davetin süresi dolmuş'}
        
        new_status = 'accepted' if accept else 'declined'
        self.collection.update_one(
            {'_id': ObjectId(invite_id)},
            {'$set': {'status': new_status, 'responded_at': datetime.utcnow()}}
        )
        
        if accept:
            return {
                'success': True,
                'message': 'Davet kabul edildi',
                'game_settings': invite.get('game_settings', {}),
                'opponent': {
                    'user_id': str(invite['from_user']),
                    'username': invite.get('from_username')
                }
            }
        else:
            return {'success': True, 'message': 'Davet reddedildi'}
    
    def cancel_invite(self, user_id, invite_id):
        """Gönderilen daveti iptal eder."""
        result = self.collection.delete_one({
            '_id': ObjectId(invite_id),
            'from_user': ObjectId(user_id),
            'status': 'pending'
        })
        
        if result.deleted_count > 0:
            return {'success': True, 'message': 'Davet iptal edildi'}
        return {'success': False, 'error': 'Davet bulunamadı'}
    
    def get_invite_count(self, user_id):
        """Bekleyen davet sayısını döndürür."""
        count = self.collection.count_documents({
            'to_user': ObjectId(user_id),
            'status': 'pending',
            'expires_at': {'$gt': datetime.utcnow()}
        })
        return count
