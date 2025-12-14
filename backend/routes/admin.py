# routes/admin.py - GÜNCELLENMİŞ
from flask import Blueprint, request, jsonify, current_app
from models.user import User
from bson.objectid import ObjectId
from datetime import datetime

admin_bp = Blueprint('admin', __name__)

def admin_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(current_user_id, *args, **kwargs):
        user_model = User(current_app.db)
        if not user_model.is_admin(current_user_id):
            return jsonify({"error": "Admin yetkisi gerekli"}), 403
        return f(current_user_id, *args, **kwargs)
    return decorated

# token_required decorator reuse from routes.game; import it to avoid duplication
from routes.game import token_required

@admin_bp.route('/settings', methods=['GET'])
@token_required
@admin_required
def get_settings(current_user_id):
    try:
        db = current_app.db
        settings = db.settings.find_one({}, {"_id": 0})
        if not settings:
            # default settings
            settings = {
                "min_harf": 4,
                "max_harf": 10,
                "joker_costs": {"reveal_letter": 100, "reveal_half": 300, "skip_question": 400},
                "max_harf_limit": 12,
                "level_xp": 1000,
                # Frontend AdminSettings.js için gerekli ayarlar
                "site_name": "Kelime Oyunu",
                "site_description": "Eğlenceli kelime oyunu",
                "maintenance_mode": False,
                "user_registration": True,
                "max_users": 1000,
                "default_difficulty": "medium",
                "max_questions_per_game": 20,
                "base_time_per_question": 60,
                "base_points_per_question": 100,
                "hint_cost": 50,
                "adaptive_difficulty_enabled": True,
                "streak_bonus_enabled": True,
                "streak_bonus_multiplier": 1.5,
                "time_bonus_enabled": True,
                "max_time_bonus": 50,
                "max_login_attempts": 5,
                "session_timeout": 60,
                "password_min_length": 6,
                "require_email_verification": False,
                "smtp_host": "",
                "smtp_port": 587,
                "smtp_username": "",
                "smtp_password": "",
                "smtp_from_email": "noreply@kelimeoyunu.com"
            }
        return jsonify(settings)
    except Exception as e:
        print(f"❌ Ayarlar getirilirken hata: {e}")
        return jsonify({"error": f"Sunucu hatası: {str(e)}"}), 500

@admin_bp.route('/settings', methods=['POST'])
@token_required
@admin_required
def update_settings(current_user_id):
    data = request.get_json() or {}
    db = current_app.db
    # Upsert settings doc and record history for rollback/audit
    try:
        old = db.settings.find_one({})
        
        # Save history - settings_history koleksiyonu yoksa oluştur
        history_doc = {
            "changed_by": ObjectId(current_user_id) if current_user_id else None,
            "changed_at": datetime.utcnow(),
            "old": old,
            "new": data
        }
        
        # settings_history koleksiyonunu kontrol et ve ekle
        if 'settings_history' not in db.list_collection_names():
            db.create_collection('settings_history')
        db.settings_history.insert_one(history_doc)

        # Upsert new settings
        db.settings.update_one({}, {"$set": data}, upsert=True)
        return jsonify({"message": "Ayarlar güncellendi", "settings": data})
    except Exception as e:
        print(f"❌ Ayar güncelleme hatası: {e}")
        return jsonify({"error": f"Sunucu hatası: {str(e)}"}), 500

@admin_bp.route('/settings/history', methods=['GET'])
@token_required
@admin_required
def get_settings_history(current_user_id):
    """
    Ayar değişiklik geçmişini döndürür (son 20).
    """
    try:
        db = current_app.db
        
        # settings_history koleksiyonu yoksa boş dizi döndür
        if 'settings_history' not in db.list_collection_names():
            return jsonify({"history": []})
            
        history = list(db.settings_history.find({}).sort("changed_at", -1).limit(20))
        
        # ObjectId'leri string'e çevir ve Datetime'ları ISO formatına çevir
        for doc in history:
            if "_id" in doc:
                doc["_id"] = str(doc["_id"])
            if "changed_by" in doc and doc["changed_by"]:
                doc["changed_by"] = str(doc["changed_by"])
            if "changed_at" in doc:
                doc["changed_at"] = doc["changed_at"].isoformat()
            
            # old ve new alanlarındaki ObjectId'leri de dönüştür
            if "old" in doc and doc["old"]:
                doc["old"] = convert_objectids_to_string(doc["old"])
            if "new" in doc and doc["new"]:
                doc["new"] = convert_objectids_to_string(doc["new"])
                
        return jsonify({"history": history})
    except Exception as e:
        print(f"❌ Geçmiş alınamadı: {e}")
        return jsonify({"error": f"Sunucu hatası: {str(e)}"}), 500

def convert_objectids_to_string(obj):
    """
    Recursive olarak bir objedeki tüm ObjectId'leri string'e çevirir.
    """
    if isinstance(obj, ObjectId):
        return str(obj)
    elif isinstance(obj, dict):
        return {k: convert_objectids_to_string(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_objectids_to_string(item) for item in obj]
    elif isinstance(obj, datetime):
        return obj.isoformat()
    else:
        return obj

@admin_bp.route('/settings/rollback/<history_id>', methods=['POST'])
@token_required
@admin_required
def rollback_settings(current_user_id, history_id):
    """
    Belirli bir history kaydına geri döner.
    """
    try:
        db = current_app.db
        
        # settings_history koleksiyonu yoksa hata döndür
        if 'settings_history' not in db.list_collection_names():
            return jsonify({"error": "Geçmiş kaydı bulunamadı"}), 404
            
        history_record = db.settings_history.find_one({"_id": ObjectId(history_id)})
        if not history_record:
            return jsonify({"error": "Geçmiş kaydı bulunamadı"}), 404
        
        old_settings = history_record.get("old")
        if not old_settings:
            return jsonify({"error": "Önceki ayarlar bulunamadı"}), 400
        
        # Yeni geri dönüş kaydı ekle (audit trail)
        rollback_doc = {
            "changed_by": ObjectId(current_user_id),
            "changed_at": datetime.utcnow(),
            "old": db.settings.find_one({}),
            "new": old_settings,
            "rollback_from": ObjectId(history_id)
        }
        db.settings_history.insert_one(rollback_doc)
        
        # Ayarları geri yükle
        db.settings.update_one({}, {"$set": old_settings}, upsert=True)
        return jsonify({"message": "Ayarlar geri yüklendi", "settings": old_settings})
    except Exception as e:
        print(f"❌ Rollback hatası: {e}")
        return jsonify({"error": f"Sunucu hatası: {str(e)}"}), 500

@admin_bp.route('/clear-cache', methods=['POST'])

@token_required

@admin_required

def clear_cache(current_user_id):

    """

    Placeholder for clearing cache.

    """

    return jsonify({"message": "Önbellek temizlendi (simülasyon)"})



@admin_bp.route('/backup-database', methods=['POST'])

@token_required

@admin_required

def backup_database(current_user_id):

    """

    Placeholder for backing up the database.

    """

    return jsonify({"message": "Veritabanı yedeklendi (simülasyon)"})



@admin_bp.route('/send-test-email', methods=['POST'])

@token_required

@admin_required

def send_test_email(current_user_id):

    """

    Placeholder for sending a test email.

    """

    return jsonify({"message": "Test e-postası gönderildi (simülasyon)"})



@admin_bp.route('/update-leaderboard', methods=['POST'])

@token_required

@admin_required

def update_leaderboard(current_user_id):

    """

    Placeholder for updating the leaderboard.

    """

    return jsonify({"message": "Liderlik tablosu güncellendi (simülasyon)"})

@admin_bp.route('/cleanup-duplicate-achievements', methods=['POST'])
@token_required
@admin_required
def cleanup_duplicate_achievements(current_user_id):
    """
    Tüm kullanıcıların duplicate başarımlarını temizler.
    """
    try:
        db = current_app.db
        user_model = User(db)
        
        # Tüm kullanıcıları al
        users = list(db.users.find({}, {"_id": 1}))
        cleaned_count = 0
        
        for user in users:
            user_id = str(user['_id'])
            if user_model.remove_duplicate_achievements(user_id):
                cleaned_count += 1
        
        return jsonify({
            "message": f"{cleaned_count} kullanıcının başarımları temizlendi",
            "total_users": len(users),
            "cleaned_users": cleaned_count
        })
    except Exception as e:
        print(f"❌ Duplicate temizleme hatası: {e}")
        return jsonify({"error": f"Sunucu hatası: {str(e)}"}), 500


@admin_bp.route('/users', methods=['GET'])
@token_required
@admin_required
def get_all_users(current_user_id):
    """
    Tüm kullanıcıları listeler (admin için).
    """
    try:
        db = current_app.db
        users = list(db.users.find({}, {
            "password": 0  # Şifreyi gizle
        }).sort("metadata.created_at", -1).limit(100))
        
        # ObjectId'leri string'e çevir
        for user in users:
            user["_id"] = str(user["_id"])
            if "metadata" in user and "created_at" in user["metadata"]:
                user["metadata"]["created_at"] = user["metadata"]["created_at"].isoformat() if user["metadata"]["created_at"] else None
            if "metadata" in user and "last_login_at" in user["metadata"]:
                user["metadata"]["last_login_at"] = user["metadata"]["last_login_at"].isoformat() if user["metadata"]["last_login_at"] else None
        
        return jsonify({"users": users, "total": len(users)})
    except Exception as e:
        print(f"❌ Kullanıcı listesi hatası: {e}")
        return jsonify({"error": f"Sunucu hatası: {str(e)}"}), 500


@admin_bp.route('/stats', methods=['GET'])
@token_required
@admin_required
def get_admin_stats(current_user_id):
    """
    Admin dashboard için genel istatistikler.
    """
    try:
        db = current_app.db
        
        total_users = db.users.count_documents({})
        total_games = db.games.count_documents({})
        total_words = db.words.count_documents({})
        active_games = db.active_games.count_documents({})
        
        # Son 24 saat içinde giriş yapan kullanıcılar
        from datetime import timedelta
        yesterday = datetime.utcnow() - timedelta(days=1)
        active_users_24h = db.users.count_documents({
            "metadata.last_login_at": {"$gte": yesterday}
        })
        
        # Son 7 gün içinde oynanan oyunlar
        last_week = datetime.utcnow() - timedelta(days=7)
        games_last_week = db.games.count_documents({
            "start_time": {"$gte": last_week}
        })
        
        return jsonify({
            "total_users": total_users,
            "total_games": total_games,
            "total_words": total_words,
            "active_games": active_games,
            "active_users_24h": active_users_24h,
            "games_last_week": games_last_week
        })
    except Exception as e:
        print(f"❌ Admin stats hatası: {e}")
        return jsonify({"error": f"Sunucu hatası: {str(e)}"}), 500


# =====================
# BAŞARIM YÖNETİMİ
# =====================

@admin_bp.route('/achievements', methods=['GET'])
@token_required
@admin_required
def get_all_achievements(current_user_id):
    """Tüm başarımları listeler."""
    try:
        db = current_app.db
        
        # achievements koleksiyonu yoksa varsayılanları oluştur
        if 'achievements' not in db.list_collection_names():
            db.create_collection('achievements')
            # Varsayılan başarımları ekle
            default_achievements = [
                {'id': 'first_game', 'name': 'İlk Adım', 'description': 'İlk oyununu tamamla', 'icon': '🎮', 'requirement_type': 'games_played', 'requirement_value': 1, 'reward_points': 50, 'active': True},
                {'id': 'score_100', 'name': 'Yüzlük', 'description': '100 puan kazan', 'icon': '💯', 'requirement_type': 'total_score', 'requirement_value': 100, 'reward_points': 100, 'active': True},
                {'id': 'score_500', 'name': 'Beş Yüzlük', 'description': '500 puan kazan', 'icon': '🏆', 'requirement_type': 'total_score', 'requirement_value': 500, 'reward_points': 200, 'active': True},
                {'id': 'score_1000', 'name': 'Binlik', 'description': '1000 puan kazan', 'icon': '👑', 'requirement_type': 'total_score', 'requirement_value': 1000, 'reward_points': 500, 'active': True},
                {'id': 'games_10', 'name': 'Deneyimli', 'description': '10 oyun tamamla', 'icon': '⭐', 'requirement_type': 'games_played', 'requirement_value': 10, 'reward_points': 100, 'active': True},
                {'id': 'games_50', 'name': 'Uzman', 'description': '50 oyun tamamla', 'icon': '🌟', 'requirement_type': 'games_played', 'requirement_value': 50, 'reward_points': 300, 'active': True},
                {'id': 'games_100', 'name': 'Usta', 'description': '100 oyun tamamla', 'icon': '💫', 'requirement_type': 'games_played', 'requirement_value': 100, 'reward_points': 500, 'active': True},
                {'id': 'perfect_game', 'name': 'Mükemmeliyetçi', 'description': 'Bir oyunda tüm soruları doğru cevapla', 'icon': '✨', 'requirement_type': 'perfect_game', 'requirement_value': 1, 'reward_points': 200, 'active': True},
                {'id': 'streak_5', 'name': 'Seri Katil', 'description': '5 doğru cevap serisi yap', 'icon': '🔥', 'requirement_type': 'best_streak', 'requirement_value': 5, 'reward_points': 100, 'active': True},
                {'id': 'streak_10', 'name': 'Durdurulamaz', 'description': '10 doğru cevap serisi yap', 'icon': '⚡', 'requirement_type': 'best_streak', 'requirement_value': 10, 'reward_points': 250, 'active': True},
                {'id': 'fast_answer', 'name': 'Şimşek', 'description': '3 saniyede doğru cevap ver', 'icon': '⚡', 'requirement_type': 'fast_answer', 'requirement_value': 3, 'reward_points': 150, 'active': True},
                {'id': 'daily_player', 'name': 'Sadık Oyuncu', 'description': '7 gün üst üste oyna', 'icon': '📅', 'requirement_type': 'consecutive_days', 'requirement_value': 7, 'reward_points': 300, 'active': True},
            ]
            db.achievements.insert_many(default_achievements)
        
        achievements = list(db.achievements.find({}))
        for a in achievements:
            a['_id'] = str(a['_id'])
        
        return jsonify({'success': True, 'achievements': achievements})
    except Exception as e:
        print(f"❌ Başarımlar listelenemedi: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@admin_bp.route('/achievements', methods=['POST'])
@token_required
@admin_required
def create_achievement(current_user_id):
    """Yeni başarım oluşturur."""
    try:
        data = request.get_json() or {}
        required_fields = ['id', 'name', 'description', 'icon', 'requirement_type', 'requirement_value']
        
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'{field} gerekli'}), 400
        
        db = current_app.db
        
        # ID benzersiz mi kontrol et
        existing = db.achievements.find_one({'id': data['id']})
        if existing:
            return jsonify({'success': False, 'error': 'Bu ID zaten kullanımda'}), 400
        
        achievement = {
            'id': data['id'],
            'name': data['name'],
            'description': data['description'],
            'icon': data['icon'],
            'requirement_type': data['requirement_type'],
            'requirement_value': int(data['requirement_value']),
            'reward_points': int(data.get('reward_points', 100)),
            'active': data.get('active', True),
            'created_at': datetime.utcnow()
        }
        
        db.achievements.insert_one(achievement)
        
        return jsonify({'success': True, 'message': 'Başarım oluşturuldu'})
    except Exception as e:
        print(f"❌ Başarım oluşturulamadı: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@admin_bp.route('/achievements/<achievement_id>', methods=['PUT'])
@token_required
@admin_required
def update_achievement(current_user_id, achievement_id):
    """Başarım günceller."""
    try:
        data = request.get_json() or {}
        db = current_app.db
        
        update_fields = {}
        for key in ['name', 'description', 'icon', 'requirement_type', 'requirement_value', 'reward_points', 'active']:
            if key in data:
                update_fields[key] = data[key]
        
        if not update_fields:
            return jsonify({'success': False, 'error': 'Güncellenecek alan yok'}), 400
        
        result = db.achievements.update_one(
            {'id': achievement_id},
            {'$set': update_fields}
        )
        
        if result.matched_count == 0:
            return jsonify({'success': False, 'error': 'Başarım bulunamadı'}), 404
        
        return jsonify({'success': True, 'message': 'Başarım güncellendi'})
    except Exception as e:
        print(f"❌ Başarım güncellenemedi: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@admin_bp.route('/achievements/<achievement_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_achievement(current_user_id, achievement_id):
    """Başarım siler."""
    try:
        db = current_app.db
        
        result = db.achievements.delete_one({'id': achievement_id})
        
        if result.deleted_count == 0:
            return jsonify({'success': False, 'error': 'Başarım bulunamadı'}), 404
        
        return jsonify({'success': True, 'message': 'Başarım silindi'})
    except Exception as e:
        print(f"❌ Başarım silinemedi: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


# =====================
# GÜNLÜK GÖREV YÖNETİMİ
# =====================

@admin_bp.route('/daily-task-definitions', methods=['GET'])
@token_required
@admin_required
def get_daily_task_definitions(current_user_id):
    """Tüm günlük görev tanımlarını listeler."""
    try:
        db = current_app.db
        
        # daily_task_definitions koleksiyonu yoksa varsayılanları oluştur
        if 'daily_task_definitions' not in db.list_collection_names():
            db.create_collection('daily_task_definitions')
            default_tasks = [
                {'id': 'play_1_game', 'name': 'Günlük Oyun', 'description': '1 oyun oyna', 'icon': '🎮', 'task_type': 'games_played', 'target': 1, 'reward_points': 50, 'active': True},
                {'id': 'play_3_games', 'name': 'Üçleme', 'description': '3 oyun oyna', 'icon': '🎯', 'task_type': 'games_played', 'target': 3, 'reward_points': 100, 'active': True},
                {'id': 'win_5_correct', 'name': 'Doğru Cevapçı', 'description': '5 doğru cevap ver', 'icon': '✅', 'task_type': 'correct_answers', 'target': 5, 'reward_points': 75, 'active': True},
                {'id': 'earn_500_points', 'name': 'Puan Avcısı', 'description': '500 puan kazan', 'icon': '💰', 'task_type': 'score_earned', 'target': 500, 'reward_points': 150, 'active': True},
                {'id': 'streak_3', 'name': 'Seri Başlangıcı', 'description': '3 doğru seri yap', 'icon': '🔥', 'task_type': 'best_streak', 'target': 3, 'reward_points': 100, 'active': True},
            ]
            db.daily_task_definitions.insert_many(default_tasks)
        
        tasks = list(db.daily_task_definitions.find({}))
        for t in tasks:
            t['_id'] = str(t['_id'])
        
        return jsonify({'success': True, 'tasks': tasks})
    except Exception as e:
        print(f"❌ Görev tanımları listelenemedi: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@admin_bp.route('/daily-task-definitions', methods=['POST'])
@token_required
@admin_required
def create_daily_task_definition(current_user_id):
    """Yeni günlük görev tanımı oluşturur."""
    try:
        data = request.get_json() or {}
        required_fields = ['id', 'name', 'description', 'icon', 'task_type', 'target']
        
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'error': f'{field} gerekli'}), 400
        
        db = current_app.db
        
        # ID benzersiz mi kontrol et
        existing = db.daily_task_definitions.find_one({'id': data['id']})
        if existing:
            return jsonify({'success': False, 'error': 'Bu ID zaten kullanımda'}), 400
        
        task = {
            'id': data['id'],
            'name': data['name'],
            'description': data['description'],
            'icon': data['icon'],
            'task_type': data['task_type'],
            'target': int(data['target']),
            'reward_points': int(data.get('reward_points', 100)),
            'active': data.get('active', True),
            'created_at': datetime.utcnow()
        }
        
        db.daily_task_definitions.insert_one(task)
        
        return jsonify({'success': True, 'message': 'Görev tanımı oluşturuldu'})
    except Exception as e:
        print(f"❌ Görev tanımı oluşturulamadı: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@admin_bp.route('/daily-task-definitions/<task_id>', methods=['PUT'])
@token_required
@admin_required
def update_daily_task_definition(current_user_id, task_id):
    """Günlük görev tanımı günceller."""
    try:
        data = request.get_json() or {}
        db = current_app.db
        
        update_fields = {}
        for key in ['name', 'description', 'icon', 'task_type', 'target', 'reward_points', 'active']:
            if key in data:
                update_fields[key] = data[key]
        
        if not update_fields:
            return jsonify({'success': False, 'error': 'Güncellenecek alan yok'}), 400
        
        result = db.daily_task_definitions.update_one(
            {'id': task_id},
            {'$set': update_fields}
        )
        
        if result.matched_count == 0:
            return jsonify({'success': False, 'error': 'Görev tanımı bulunamadı'}), 404
        
        return jsonify({'success': True, 'message': 'Görev tanımı güncellendi'})
    except Exception as e:
        print(f"❌ Görev tanımı güncellenemedi: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@admin_bp.route('/daily-task-definitions/<task_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_daily_task_definition(current_user_id, task_id):
    """Günlük görev tanımı siler."""
    try:
        db = current_app.db
        
        result = db.daily_task_definitions.delete_one({'id': task_id})
        
        if result.deleted_count == 0:
            return jsonify({'success': False, 'error': 'Görev tanımı bulunamadı'}), 404
        
        return jsonify({'success': True, 'message': 'Görev tanımı silindi'})
    except Exception as e:
        print(f"❌ Görev tanımı silinemedi: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500