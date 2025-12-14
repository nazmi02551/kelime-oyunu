# routes/friends.py
from flask import Blueprint, request, jsonify, current_app
from models.friendship import Friendship
from routes.game import token_required

friends_bp = Blueprint('friends', __name__)

@friends_bp.route('/list', methods=['GET'])
@token_required
def get_friends(current_user_id):
    """Arkadaş listesini getirir."""
    try:
        db = current_app.db
        friendship_model = Friendship(db)
        
        friends = friendship_model.get_friends(current_user_id)
        
        # Datetime'ları string'e çevir
        for friend in friends:
            if 'since' in friend and friend['since']:
                friend['since'] = friend['since'].isoformat()
        
        return jsonify({
            'success': True,
            'friends': friends,
            'count': len(friends)
        })
        
    except Exception as e:
        print(f"❌ Arkadaş listesi alınırken hata: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@friends_bp.route('/requests', methods=['GET'])
@token_required
def get_friend_requests(current_user_id):
    """Bekleyen arkadaşlık isteklerini getirir."""
    try:
        db = current_app.db
        friendship_model = Friendship(db)
        
        pending = friendship_model.get_pending_requests(current_user_id)
        sent = friendship_model.get_sent_requests(current_user_id)
        
        # Datetime'ları string'e çevir
        for req in pending + sent:
            if 'created_at' in req and req['created_at']:
                req['created_at'] = req['created_at'].isoformat()
        
        return jsonify({
            'success': True,
            'pending': pending,
            'sent': sent
        })
        
    except Exception as e:
        print(f"❌ Arkadaşlık istekleri alınırken hata: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@friends_bp.route('/send', methods=['POST'])
@token_required
def send_friend_request(current_user_id):
    """Arkadaşlık isteği gönderir."""
    try:
        data = request.get_json() or {}
        to_username = data.get('to_username')
        to_user_id = data.get('to_user_id')
        
        db = current_app.db
        
        # Username ile geldiyse, user_id'ye çevir
        if to_username and not to_user_id:
            user = db.users.find_one({'username': to_username})
            if not user:
                return jsonify({'success': False, 'error': 'Kullanıcı bulunamadı'}), 404
            to_user_id = str(user['_id'])
        
        if not to_user_id:
            return jsonify({'success': False, 'error': 'to_user_id veya to_username gerekli'}), 400
        
        friendship_model = Friendship(db)
        
        result = friendship_model.send_friend_request(current_user_id, to_user_id)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
        
    except Exception as e:
        print(f"❌ Arkadaşlık isteği gönderilirken hata: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@friends_bp.route('/respond', methods=['POST'])
@token_required
def respond_to_request(current_user_id):
    """Arkadaşlık isteğine yanıt verir."""
    try:
        data = request.get_json() or {}
        request_id = data.get('request_id') or data.get('friendship_id')
        accept = data.get('accept', True)
        
        if not request_id:
            return jsonify({'success': False, 'error': 'request_id veya friendship_id gerekli'}), 400
        
        db = current_app.db
        friendship_model = Friendship(db)
        
        result = friendship_model.respond_to_request(current_user_id, request_id, accept)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
        
    except Exception as e:
        print(f"❌ Arkadaşlık isteği yanıtlanırken hata: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@friends_bp.route('/remove', methods=['POST'])
@token_required
def remove_friend(current_user_id):
    """Arkadaşlıktan çıkarır."""
    try:
        data = request.get_json() or {}
        friend_id = data.get('friend_id')
        friend_username = data.get('friend_username')
        
        db = current_app.db
        
        # Username ile geldiyse, user_id'ye çevir
        if friend_username and not friend_id:
            user = db.users.find_one({'username': friend_username})
            if not user:
                return jsonify({'success': False, 'error': 'Kullanıcı bulunamadı'}), 404
            friend_id = str(user['_id'])
        
        if not friend_id:
            return jsonify({'success': False, 'error': 'friend_id veya friend_username gerekli'}), 400
        
        friendship_model = Friendship(db)
        
        result = friendship_model.remove_friend(current_user_id, friend_id)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
        
    except Exception as e:
        print(f"❌ Arkadaşlık kaldırılırken hata: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@friends_bp.route('/search', methods=['GET'])
@token_required
def search_users(current_user_id):
    """Kullanıcı araması yapar."""
    try:
        query = request.args.get('q', '')
        
        if len(query) < 2:
            return jsonify({'success': False, 'error': 'En az 2 karakter gerekli'}), 400
        
        db = current_app.db
        friendship_model = Friendship(db)
        
        results = friendship_model.search_users(query, current_user_id)
        
        return jsonify({
            'success': True,
            'users': results,
            'count': len(results)
        })
        
    except Exception as e:
        print(f"❌ Kullanıcı aranırken hata: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@friends_bp.route('/block', methods=['POST'])
@token_required
def block_user(current_user_id):
    """Kullanıcıyı engeller."""
    try:
        data = request.get_json() or {}
        blocked_user_id = data.get('user_id')
        
        if not blocked_user_id:
            return jsonify({'success': False, 'error': 'user_id gerekli'}), 400
        
        db = current_app.db
        friendship_model = Friendship(db)
        
        result = friendship_model.block_user(current_user_id, blocked_user_id)
        
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ Kullanıcı engellenirken hata: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@friends_bp.route('/profile/<username>', methods=['GET'])
@token_required
def get_friend_profile(current_user_id, username):
    """Arkadaşın profilini getirir."""
    try:
        from bson import ObjectId
        db = current_app.db
        
        # Kullanıcıyı bul
        user = db.users.find_one({'username': username}, {'password': 0})
        if not user:
            return jsonify({'success': False, 'error': 'Kullanıcı bulunamadı'}), 404
        
        target_user_id = str(user['_id'])
        
        # Arkadaşlık durumunu kontrol et
        friendship_model = Friendship(db)
        is_friend = friendship_model._check_friendship_exists(current_user_id, target_user_id)
        
        # Temel bilgiler herkese açık
        profile = {
            'user_id': target_user_id,
            'username': user.get('username'),
            'created_at': user.get('created_at').isoformat() if user.get('created_at') else None,
            'is_friend': is_friend,
            'is_self': current_user_id == target_user_id
        }
        
        # İstatistikler (arkadaşlara açık)
        if is_friend or current_user_id == target_user_id:
            stats = user.get('statistics', {})
            profile['statistics'] = {
                'total_score': stats.get('total_score', 0),
                'games_played': stats.get('games_played', 0),
                'total_correct_answers': stats.get('total_correct_answers', 0),
                'total_wrong_answers': stats.get('total_wrong_answers', 0),
                'success_rate': stats.get('success_rate', 0),
                'current_streak': stats.get('current_streak', 0),
                'longest_streak': stats.get('longest_streak', 0),
                'average_score': stats.get('average_score', 0)
            }
            
            # Başarımlar
            achievements = user.get('achievements', [])
            profile['achievements'] = [{
                'id': ach.get('id'),
                'name': ach.get('name'),
                'unlocked_at': ach.get('unlocked_at').isoformat() if ach.get('unlocked_at') else None
            } for ach in achievements[:10]]  # Son 10 başarım
            
            profile['achievements_count'] = len(achievements)
        
        return jsonify({
            'success': True,
            'profile': profile
        })
        
    except Exception as e:
        print(f"❌ Profil alınırken hata: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
