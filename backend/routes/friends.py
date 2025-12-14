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
        to_user_id = data.get('to_user_id')
        
        if not to_user_id:
            return jsonify({'success': False, 'error': 'to_user_id gerekli'}), 400
        
        db = current_app.db
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
        request_id = data.get('request_id')
        accept = data.get('accept', True)
        
        if not request_id:
            return jsonify({'success': False, 'error': 'request_id gerekli'}), 400
        
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
        
        if not friend_id:
            return jsonify({'success': False, 'error': 'friend_id gerekli'}), 400
        
        db = current_app.db
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
