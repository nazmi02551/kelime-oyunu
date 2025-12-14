# routes/game_invites.py
from flask import Blueprint, request, jsonify, current_app
from models.game_invite import GameInvite
from routes.game import token_required

game_invites_bp = Blueprint('game_invites', __name__)

@game_invites_bp.route('/send', methods=['POST'])
@token_required
def send_invite(current_user_id):
    """Oyun daveti gönderir."""
    try:
        data = request.get_json() or {}
        to_user_id = data.get('to_user_id')
        to_username = data.get('to_username')
        game_settings = data.get('game_settings', {'question_count': 10})
        
        db = current_app.db
        
        # Username ile geldiyse user_id'ye çevir
        if to_username and not to_user_id:
            user = db.users.find_one({'username': to_username})
            if not user:
                return jsonify({'success': False, 'error': 'Kullanıcı bulunamadı'}), 404
            to_user_id = str(user['_id'])
        
        if not to_user_id:
            return jsonify({'success': False, 'error': 'Davet edilecek kullanıcı belirtilmeli'}), 400
        
        invite_model = GameInvite(db)
        result = invite_model.send_invite(current_user_id, to_user_id, game_settings)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
        
    except Exception as e:
        print(f"❌ Davet gönderilirken hata: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@game_invites_bp.route('/pending', methods=['GET'])
@token_required
def get_pending_invites(current_user_id):
    """Bekleyen davetleri getirir."""
    try:
        db = current_app.db
        invite_model = GameInvite(db)
        
        invites = invite_model.get_pending_invites(current_user_id)
        
        return jsonify({
            'success': True,
            'invites': invites,
            'count': len(invites)
        })
        
    except Exception as e:
        print(f"❌ Davetler alınırken hata: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@game_invites_bp.route('/sent', methods=['GET'])
@token_required
def get_sent_invites(current_user_id):
    """Gönderilen davetleri getirir."""
    try:
        db = current_app.db
        invite_model = GameInvite(db)
        
        invites = invite_model.get_sent_invites(current_user_id)
        
        return jsonify({
            'success': True,
            'invites': invites,
            'count': len(invites)
        })
        
    except Exception as e:
        print(f"❌ Gönderilen davetler alınırken hata: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@game_invites_bp.route('/respond/<invite_id>', methods=['POST'])
@token_required
def respond_to_invite(current_user_id, invite_id):
    """Davete yanıt verir."""
    try:
        data = request.get_json() or {}
        accept = data.get('accept', True)
        
        db = current_app.db
        invite_model = GameInvite(db)
        
        result = invite_model.respond_to_invite(current_user_id, invite_id, accept)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
        
    except Exception as e:
        print(f"❌ Davete yanıt verilirken hata: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@game_invites_bp.route('/cancel/<invite_id>', methods=['DELETE'])
@token_required
def cancel_invite(current_user_id, invite_id):
    """Daveti iptal eder."""
    try:
        db = current_app.db
        invite_model = GameInvite(db)
        
        result = invite_model.cancel_invite(current_user_id, invite_id)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
        
    except Exception as e:
        print(f"❌ Davet iptal edilirken hata: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@game_invites_bp.route('/count', methods=['GET'])
@token_required
def get_invite_count(current_user_id):
    """Bekleyen davet sayısını döndürür."""
    try:
        db = current_app.db
        invite_model = GameInvite(db)
        
        count = invite_model.get_invite_count(current_user_id)
        
        return jsonify({
            'success': True,
            'count': count
        })
        
    except Exception as e:
        print(f"❌ Davet sayısı alınırken hata: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
