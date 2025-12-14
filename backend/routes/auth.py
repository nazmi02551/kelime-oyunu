# routes/auth.py - GÜNCELLENMİŞ
from flask import Blueprint, request, jsonify, current_app
from models.user import User
import jwt
import datetime
from config import Config
from bson.objectid import ObjectId

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    profile_data = {
        "age_group": data.get('age_group'),
        "education_level": data.get('education_level'),
        "gender": data.get('gender'),
        "location": data.get('location')
    }
    preferences = {
        "theme": data.get('theme', 'dark'),
        "sound_enabled": data.get('sound_enabled', True),
        "difficulty_preference": data.get('difficulty_preference', 'static'),
        "categories": data.get('categories', [])
    }

    if not username or not email or not password:
        return jsonify({"error": "Eksik bilgi"}), 400

    db = current_app.db
    user_model = User(db)

    if user_model.find_by_email(email):
        return jsonify({"error": "Bu e-posta zaten kayıtlı"}), 409

    user_model.create_user(username, email, password, profile_data, preferences, is_admin=False)
    return jsonify({"message": "Kullanıcı başarıyla oluşturuldu"}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"error": "Eksik bilgi"}), 400

    db = current_app.db
    user_model = User(db)
    user = user_model.find_by_email(email)

    if user and user_model.check_password(user['password'], password):
        token = jwt.encode({
            'user_id': str(user['_id']),
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, Config.SECRET_KEY, algorithm="HS256")
        if isinstance(token, bytes):
            token = token.decode('utf-8')

        # GÜNCELLENMİŞ KISIM: is_admin ve adaptive_difficulty eklendi
        user_data = {
            "id": str(user['_id']),
            "username": user['username'],
            "email": user['email'],
            "is_admin": user.get('is_admin', False),  # ✅ EKLENDİ
            "profile": user.get('profile', {}),
            "statistics": user.get('statistics', {}),
            "preferences": user.get('preferences', {}),
            "adaptive_difficulty": user.get('adaptive_difficulty', {})  # ✅ EKLENDİ
        }

        user_model.set_last_login(str(user['_id']))

        return jsonify({"token": token, "user": user_data})

    return jsonify({"error": "Geçersiz e-posta veya şifre"}), 401

@auth_bp.route('/verify', methods=['GET'])
def verify_token():
    auth_header = request.headers.get('Authorization', '')
    token = None
    if auth_header:
        parts = auth_header.split()
        if len(parts) >= 2:
            token = parts[1]
    if not token:
        return jsonify({"error": "Token eksik"}), 401

    try:
        data_token = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
        user_id = data_token['user_id']
        db = current_app.db
        user_model = User(db)
        user = user_model.find_by_id(user_id)
        if not user:
            return jsonify({"error": "Kullanıcı bulunamadı"}), 404

        # GÜNCELLENMİŞ KISIM: is_admin ve adaptive_difficulty eklendi
        user_data = {
            "id": str(user['_id']),
            "username": user['username'],
            "email": user['email'],
            "is_admin": user.get('is_admin', False),  # ✅ EKLENDİ
            "profile": user.get('profile', {}),
            "preferences": user.get('preferences', {}),
            "statistics": user.get('statistics', {}),
            "adaptive_difficulty": user.get('adaptive_difficulty', {})  # ✅ EKLENDİ
        }
        return jsonify({"user": user_data})
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token süresi dolmuş"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "Geçersiz token"}), 401

@auth_bp.route('/me', methods=['GET'])
def get_current_user():
    """Yeni endpoint: Güncel kullanıcı bilgilerini döndürür"""
    auth_header = request.headers.get('Authorization', '')
    token = None
    if auth_header:
        parts = auth_header.split()
        if len(parts) >= 2:
            token = parts[1]
    if not token:
        return jsonify({"error": "Token eksik"}), 401

    try:
        data_token = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
        user_id = data_token['user_id']
        db = current_app.db
        user_model = User(db)
        user = user_model.find_by_id(user_id)
        if not user:
            return jsonify({"error": "Kullanıcı bulunamadı"}), 404

        # GÜNCELLENMİŞ KISIM: Tüm kullanıcı verileri
        user_data = {
            "id": str(user['_id']),
            "username": user['username'],
            "email": user['email'],
            "is_admin": user.get('is_admin', False),
            "profile": user.get('profile', {}),
            "preferences": user.get('preferences', {}),
            "statistics": user.get('statistics', {}),
            "adaptive_difficulty": user.get('adaptive_difficulty', {}),
            "achievements": user.get('achievements', [])
        }
        return jsonify({"user": user_data})
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token süresi dolmuş"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "Geçersiz token"}), 401

@auth_bp.route('/update-profile', methods=['POST'])
def update_profile():
    auth_header = request.headers.get('Authorization', '')
    token = None
    if auth_header:
        parts = auth_header.split()
        if len(parts) >= 2:
            token = parts[1]
    if not token:
        return jsonify({"error": "Token eksik"}), 401
    try:
        data_token = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
        user_id = data_token['user_id']
    except Exception:
        return jsonify({"error": "Token geçersiz"}), 401

    data = request.get_json() or {}
    profile = data.get('profile', {})
    preferences = data.get('preferences', {})

    db = current_app.db
    user_model = User(db)
    
    set_fields = {}
    if profile:
        set_fields['profile'] = profile
    if preferences:
        set_fields['preferences'] = preferences

    if set_fields:
        db.users.update_one({"_id": ObjectId(user_id)}, {"$set": set_fields})
        user = user_model.find_by_id(user_id)
        
        # GÜNCELLENMİŞ RESPONSE
        user_data = {
            "id": str(user['_id']),
            "username": user['username'],
            "email": user['email'],
            "is_admin": user.get('is_admin', False),  # ✅ EKLENDİ
            "profile": user.get('profile', {}),
            "preferences": user.get('preferences', {}),
            "statistics": user.get('statistics', {}),
            "adaptive_difficulty": user.get('adaptive_difficulty', {})  # ✅ EKLENDİ
        }
        return jsonify({"message": "Profil güncellendi", "user": user_data})
    return jsonify({"error": "Güncellenecek veri yok"}), 400