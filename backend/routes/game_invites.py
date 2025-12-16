# routes/game_invites.py
from flask import Blueprint, request, jsonify, current_app
from models.game_invite import GameInvite
from routes.game import token_required

game_invites_bp = Blueprint('game_invites', __name__)

# SocketIO instance'ı - routes/multiplayer.py'den import edilecek
socketio = None

def init_socketio_invites(sio):
    """SocketIO instance'ını ayarla"""
    global socketio
    socketio = sio

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
        
        print(f"📋 Davet yanıtlanıyor - ID: {invite_id}, Accept: {accept}, User: {current_user_id}")
        
        result = invite_model.respond_to_invite(current_user_id, invite_id, accept)
        print(f"📋 respond_to_invite sonucu: {result}")
        
        if result['success'] and accept:
            # Multiplayer oyun oluştur
            from models.multiplayer_game import MultiplayerGame
            mp_game = MultiplayerGame(db)
            
            opponent = result.get('opponent', {})
            game_settings = result.get('game_settings', {})
            
            print(f"🎮 Multiplayer oyun oluşturuluyor - Player1: {opponent.get('user_id')}, Player2: {current_user_id}")
            print(f"🎮 Oyun ayarları: {game_settings}")
            
            game_result = mp_game.create_game(
                opponent.get('user_id'),  # Daveti gönderen player1 olsun
                current_user_id,           # Kabul eden player2 olsun
                game_settings
            )
            
            print(f"🎮 create_game sonucu: {game_result}")
            
            if game_result['success']:
                result['game_id'] = game_result['game_id']
                result['message'] = 'Davet kabul edildi, oyun başlatıldı!'
                
                # ✅ DAVETI GÖNDERENE WebSocket bildirimi
                if socketio:
                    # Kabul edeni bul
                    accepter = db.users.find_one({'_id': __import__('bson').ObjectId(current_user_id)})
                    accepter_username = accepter.get('username', 'Bir kullanıcı') if accepter else 'Bir kullanıcı'
                    
                    socketio.emit('invite_accepted', {
                        'game_id': game_result['game_id'],
                        'accepted_by': current_user_id,
                        'accepted_by_username': accepter_username,
                        'question_count': game_settings.get('question_count', 10),
                        'message': f'🎮 {accepter_username} oyun davetinizi kabul etti!'
                    }, room=f'user_{opponent.get("user_id")}')
                    print(f"📨 WebSocket: invite_accepted to user_{opponent.get('user_id')}")
            else:
                result['warning'] = 'Oyun oluşturulamadı: ' + game_result.get('error', '')
                print(f"⚠️ Oyun oluşturma başarısız: {game_result}")
        
        elif result['success'] and not accept:
            # ✅ DAVETI GÖNDERENE REDDEDİLDİ bildirimi
            if socketio:
                # Davet bilgilerini al
                invite = db.game_invites.find_one({'_id': __import__('bson').ObjectId(invite_id)})
                if invite:
                    decliner = db.users.find_one({'_id': __import__('bson').ObjectId(current_user_id)})
                    decliner_username = decliner.get('username', 'Bir kullanıcı') if decliner else 'Bir kullanıcı'
                    
                    socketio.emit('invite_declined', {
                        'invite_id': invite_id,
                        'declined_by': current_user_id,
                        'declined_by_username': decliner_username,
                        'message': f'{decliner_username} oyun davetinizi reddetti'
                    }, room=f'user_{str(invite["from_user"])}')
                    print(f"📨 WebSocket: invite_declined to user_{str(invite['from_user'])}")
        
        print(f"✅ Son sonuç: {result}")
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
        
    except Exception as e:
        print(f"❌ Davete yanıt verilirken hata: {e}")
        import traceback
        print(f"❌ Hata detayı:\n{traceback.format_exc()}")
        return jsonify({'success': False, 'error': str(e)}), 500


@game_invites_bp.route('/cancel/<invite_id>', methods=['DELETE'])
@token_required
def cancel_invite(current_user_id, invite_id):
    """Daveti iptal eder."""
    try:
        db = current_app.db
        
        # İptal etmeden önce davet bilgilerini al (WebSocket için)
        invite = db.game_invites.find_one({
            '_id': __import__('bson').ObjectId(invite_id),
            'from_user': __import__('bson').ObjectId(current_user_id),
            'status': 'pending'
        })
        
        invite_model = GameInvite(db)
        result = invite_model.cancel_invite(current_user_id, invite_id)
        
        if result['success'] and invite:
            # ✅ DAVETI ALAN TARAFA iptal bildirimi
            if socketio:
                canceller = db.users.find_one({'_id': __import__('bson').ObjectId(current_user_id)})
                canceller_username = canceller.get('username', 'Bir kullanıcı') if canceller else 'Bir kullanıcı'
                
                socketio.emit('invite_cancelled', {
                    'invite_id': invite_id,
                    'cancelled_by': current_user_id,
                    'cancelled_by_username': canceller_username,
                    'message': f'{canceller_username} oyun davetini iptal etti'
                }, room=f'user_{str(invite["to_user"])}')
                print(f"📨 WebSocket: invite_cancelled to user_{str(invite['to_user'])}")
        
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
