# routes/multiplayer.py
from flask import Blueprint, request, jsonify, current_app
from models.multiplayer_game import MultiplayerGame
from routes.game import token_required
from flask_socketio import emit

multiplayer_bp = Blueprint('multiplayer', __name__)

# SocketIO instance'ı app.py'den alacağız
socketio = None

def init_socketio(sio):
    """SocketIO instance'ını ayarla"""
    global socketio
    socketio = sio

@multiplayer_bp.route('/create', methods=['POST'])
@token_required
def create_game(current_user_id):
    """Yeni multiplayer oyun oluşturur."""
    try:
        data = request.get_json() or {}
        opponent_id = data.get('opponent_id')
        opponent_username = data.get('opponent_username')
        game_settings = data.get('game_settings', {'question_count': 10})
        
        db = current_app.db
        
        # Username ile geldiyse user_id'ye çevir
        if opponent_username and not opponent_id:
            opponent = db.users.find_one({'username': opponent_username})
            if not opponent:
                return jsonify({'success': False, 'error': 'Rakip bulunamadı'}), 404
            opponent_id = str(opponent['_id'])
        
        if not opponent_id:
            return jsonify({'success': False, 'error': 'Rakip belirtilmeli'}), 400
        
        mp_game = MultiplayerGame(db)
        result = mp_game.create_game(current_user_id, opponent_id, game_settings)
        
        if result['success']:
            # Rakibe bildirim gönder (WebSocket ile)
            if socketio:
                socketio.emit('game_invite', {
                    'game_id': result['game_id'],
                    'from_user': current_user_id,
                    'question_count': game_settings.get('question_count', 10)
                }, room=f'user_{opponent_id}')
            return jsonify(result)
        else:
            return jsonify(result), 400
        
    except Exception as e:
        print(f"❌ Multiplayer oyun oluşturulurken hata: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@multiplayer_bp.route('/ready/<game_id>', methods=['POST'])
@token_required
def set_ready(current_user_id, game_id):
    """Oyuncuyu hazır olarak işaretler."""
    try:
        db = current_app.db
        mp_game = MultiplayerGame(db)
        
        result = mp_game.set_player_ready(game_id, current_user_id)
        
        if result['success']:
            # Oyun odasındaki herkese bildirim gönder
            if socketio:
                # game_ready event'i
                socketio.emit('game_ready', {
                    'game_id': game_id,
                    'player': current_user_id,
                    'game_state': result.get('game')
                }, room=f'game_{game_id}')
                
                # ✅ Eğer her iki oyuncu da hazırsa, game_started event'i gönder
                if result.get('game_started'):
                    from bson import ObjectId
                    game = db.multiplayer_games.find_one({'_id': ObjectId(game_id)})
                    if game:
                        # Her iki oyuncunun user room'una emit
                        socketio.emit('game_started', {
                            'game_id': game_id,
                            'message': '🎮 Her iki oyuncu da hazır! Oyun başlıyor...',
                            'countdown': 3
                        }, room=f'user_{str(game["player1"])}')
                        
                        socketio.emit('game_started', {
                            'game_id': game_id,
                            'message': '🎮 Her iki oyuncu da hazır! Oyun başlıyor...',
                            'countdown': 3
                        }, room=f'user_{str(game["player2"])}')
                        
                        # Game room'a da emit
                        socketio.emit('game_started', {
                            'game_id': game_id,
                            'message': '🎮 Her iki oyuncu da hazır! Oyun başlıyor...',
                            'countdown': 3
                        }, room=f'game_{game_id}')
                        
                        print(f"🚀 WebSocket: game_started for game_{game_id}")
                        
            return jsonify(result)
        else:
            return jsonify(result), 400
        
    except Exception as e:
        print(f"❌ Ready işaretlenirken hata: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@multiplayer_bp.route('/answer/<game_id>', methods=['POST'])
@token_required
def submit_answer(current_user_id, game_id):
    """Cevap gönderir."""
    try:
        data = request.get_json() or {}
        question_index = data.get('question_index')
        answer = data.get('answer')
        time_taken = data.get('time_taken', 0)
        
        if question_index is None or answer is None:
            return jsonify({'success': False, 'error': 'Soru indeksi ve cevap gerekli'}), 400
        
        db = current_app.db
        mp_game = MultiplayerGame(db)
        
        result = mp_game.submit_answer(game_id, current_user_id, question_index, answer, time_taken)
        
        if result['success']:
            # Cevap gönderince oyun durumunu güncelle (WebSocket ile)
            if socketio:
                socketio.emit('game_update', {
                    'game_id': game_id,
                    'player': current_user_id,
                    'question_index': question_index,
                    'game_state': result.get('game')
                }, room=f'game_{game_id}')
            return jsonify(result)
        else:
            return jsonify(result), 400
        
    except Exception as e:
        print(f"❌ Cevap gönderilirken hata: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@multiplayer_bp.route('/game/<game_id>', methods=['GET'])
@token_required
def get_game(current_user_id, game_id):
    """Oyun detaylarını getirir."""
    try:
        db = current_app.db
        mp_game = MultiplayerGame(db)
        
        result = mp_game.get_game(game_id, current_user_id)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
        
    except Exception as e:
        print(f"❌ Oyun bilgisi alınırken hata: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@multiplayer_bp.route('/active', methods=['GET'])
@token_required
def get_active_games(current_user_id):
    """Aktif multiplayer oyunları getirir."""
    try:
        db = current_app.db
        mp_game = MultiplayerGame(db)
        
        games = mp_game.get_active_games(current_user_id)
        
        return jsonify({
            'success': True,
            'games': games,
            'count': len(games)
        })
        
    except Exception as e:
        print(f"❌ Aktif oyunlar alınırken hata: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@multiplayer_bp.route('/cancel/<game_id>', methods=['POST'])
@token_required
def cancel_game(current_user_id, game_id):
    """Multiplayer oyunu iptal eder."""
    try:
        db = current_app.db
        mp_game = MultiplayerGame(db)
        
        # Oyun bilgilerini iptal etmeden önce al
        from bson import ObjectId
        game = db.multiplayer_games.find_one({'_id': ObjectId(game_id)})
        
        result = mp_game.cancel_game(game_id, current_user_id)
        
        if result['success']:
            # Oyun iptal edildiğinde WebSocket ile bildir
            if socketio and game:
                canceller = db.users.find_one({'_id': ObjectId(current_user_id)})
                canceller_username = canceller.get('username', 'Rakip') if canceller else 'Rakip'
                
                # Diğer oyuncuyu bul
                other_player_id = None
                if str(game['player1']) == current_user_id:
                    other_player_id = str(game['player2'])
                else:
                    other_player_id = str(game['player1'])
                
                # 1. Game room'a emit (eski yöntem, geriye uyumluluk için)
                socketio.emit('game_cancelled', {
                    'game_id': game_id,
                    'cancelled_by': current_user_id,
                    'cancelled_by_username': canceller_username
                }, room=f'game_{game_id}')
                
                # 2. Diğer oyuncunun user room'una emit (daha güvenilir)
                if other_player_id:
                    socketio.emit('game_cancelled', {
                        'game_id': game_id,
                        'cancelled_by': current_user_id,
                        'cancelled_by_username': canceller_username,
                        'message': f'{canceller_username} oyunu iptal etti'
                    }, room=f'user_{other_player_id}')
                    print(f"📨 WebSocket: game_cancelled to user_{other_player_id}")
                    
            return jsonify(result)
        else:
            return jsonify(result), 400
        
    except Exception as e:
        print(f"❌ Oyun iptal edilirken hata: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
