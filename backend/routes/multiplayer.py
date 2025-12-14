# routes/multiplayer.py
from flask import Blueprint, request, jsonify, current_app
from models.multiplayer_game import MultiplayerGame
from routes.game import token_required

multiplayer_bp = Blueprint('multiplayer', __name__)

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
