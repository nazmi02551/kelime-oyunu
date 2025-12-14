# routes/messages.py
from flask import Blueprint, request, jsonify, current_app
from models.message import Message
from routes.game import token_required

messages_bp = Blueprint('messages', __name__)

@messages_bp.route('/conversations', methods=['GET'])
@token_required
def get_conversations(current_user_id):
    """Kullanıcının tüm konuşmalarını getirir."""
    try:
        db = current_app.db
        message_model = Message(db)
        
        conversations = message_model.get_conversations(current_user_id)
        
        # Datetime'ları string'e çevir
        for conv in conversations:
            if conv.get('last_message_at'):
                conv['last_message_at'] = conv['last_message_at'].isoformat()
        
        return jsonify({
            'success': True,
            'conversations': conversations
        })
        
    except Exception as e:
        print(f"❌ Konuşmalar alınırken hata: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@messages_bp.route('/conversation/<conversation_id>', methods=['GET'])
@token_required
def get_messages(current_user_id, conversation_id):
    """Bir konuşmadaki mesajları getirir."""
    try:
        db = current_app.db
        message_model = Message(db)
        
        limit = request.args.get('limit', 50, type=int)
        before_id = request.args.get('before_id')
        
        result = message_model.get_messages(current_user_id, conversation_id, limit, before_id)
        
        if result.get('success'):
            # Mesajları okundu olarak işaretle
            message_model.mark_as_read(current_user_id, conversation_id)
        
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ Mesajlar alınırken hata: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@messages_bp.route('/send', methods=['POST'])
@token_required
def send_message(current_user_id):
    """Mesaj gönderir."""
    try:
        data = request.get_json() or {}
        to_user_id = data.get('to_user_id')
        to_username = data.get('to_username')
        content = data.get('content')
        
        if not content:
            return jsonify({'success': False, 'error': 'Mesaj içeriği gerekli'}), 400
        
        db = current_app.db
        
        # Username ile geldiyse user_id'ye çevir
        if to_username and not to_user_id:
            user = db.users.find_one({'username': to_username})
            if not user:
                return jsonify({'success': False, 'error': 'Kullanıcı bulunamadı'}), 404
            to_user_id = str(user['_id'])
        
        if not to_user_id:
            return jsonify({'success': False, 'error': 'Alıcı belirtilmeli'}), 400
        
        message_model = Message(db)
        result = message_model.send_message(current_user_id, to_user_id, content)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
        
    except Exception as e:
        print(f"❌ Mesaj gönderilirken hata: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@messages_bp.route('/read/<conversation_id>', methods=['POST'])
@token_required
def mark_as_read(current_user_id, conversation_id):
    """Konuşmadaki mesajları okundu olarak işaretler."""
    try:
        db = current_app.db
        message_model = Message(db)
        
        result = message_model.mark_as_read(current_user_id, conversation_id)
        
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ Okundu işaretlenirken hata: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@messages_bp.route('/unread-count', methods=['GET'])
@token_required
def get_unread_count(current_user_id):
    """Okunmamış mesaj sayısını döndürür."""
    try:
        db = current_app.db
        message_model = Message(db)
        
        count = message_model.get_unread_count(current_user_id)
        
        return jsonify({
            'success': True,
            'unread_count': count
        })
        
    except Exception as e:
        print(f"❌ Okunmamış sayısı alınırken hata: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@messages_bp.route('/delete/<message_id>', methods=['DELETE'])
@token_required
def delete_message(current_user_id, message_id):
    """Mesajı siler."""
    try:
        db = current_app.db
        message_model = Message(db)
        
        result = message_model.delete_message(current_user_id, message_id)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
        
    except Exception as e:
        print(f"❌ Mesaj silinirken hata: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@messages_bp.route('/start/<friend_username>', methods=['POST'])
@token_required
def start_conversation(current_user_id, friend_username):
    """Arkadaşla yeni konuşma başlatır veya mevcut konuşmayı döndürür."""
    try:
        db = current_app.db
        
        # Arkadaşı bul
        friend = db.users.find_one({'username': friend_username})
        if not friend:
            return jsonify({'success': False, 'error': 'Kullanıcı bulunamadı'}), 404
        
        friend_id = str(friend['_id'])
        
        # Conversation ID oluştur
        message_model = Message(db)
        conversation_id = message_model._get_conversation_id(current_user_id, friend_id)
        
        # Arkadaşlık kontrolü
        if not message_model._are_friends(current_user_id, friend_id):
            return jsonify({'success': False, 'error': 'Bu kullanıcı arkadaşınız değil'}), 403
        
        return jsonify({
            'success': True,
            'conversation_id': conversation_id,
            'friend': {
                'user_id': friend_id,
                'username': friend.get('username'),
                'statistics': friend.get('statistics', {})
            }
        })
        
    except Exception as e:
        print(f"❌ Konuşma başlatılırken hata: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
