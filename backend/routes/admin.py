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
                "base_time_per_question": 17,
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
