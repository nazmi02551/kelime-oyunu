from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from datetime import datetime
from urllib.parse import urlparse
import os
import socket

from routes.auth import auth_bp
from routes.game import game_bp
from routes.admin import admin_bp
from routes.categories import categories_bp
from routes.leaderboard import leaderboard_bp
from routes.daily_tasks import daily_tasks_bp
from routes.friends import friends_bp
from routes.messages import messages_bp
from routes.game_invites import game_invites_bp
from routes.multiplayer import multiplayer_bp
from config import Config
from init_db_schema import init_db_schema
from models.active_game import ActiveGame
from models.settings import Settings

# Global SocketIO instance
socketio = None


def _get_database_from_uri(client, mongo_uri: str):
    """
    .env'deki MONGO_URI'ye göre doğru veritabanını seç.
    - mongodb+srv://.../wisdomcapsule  => wisdomcapsule
    - mongodb://localhost:27017/kelime_oyunu => kelime_oyunu
    Eğer URI'de db adı yoksa 'kelime_oyunu' varsayılan alınır.
    """
    try:
        parsed = urlparse(mongo_uri)
        db_name = parsed.path.lstrip('/') or None
        if db_name:
            return client[db_name]
    except Exception:
        pass

    try:
        db = client.get_default_database()
        if db is not None:
            return db
    except Exception:
        pass

    return client['kelime_oyunu']


def create_app():
    global socketio
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # SocketIO Setup
    socketio = SocketIO(
        app,
        cors_allowed_origins="*",
        async_mode='threading',
        logger=True,                # Debug için True yap
        engineio_logger=True        # Debug için True yap
    )

    # MongoDB bağlantısı
    try:
        mongo_uri = app.config.get('MONGO_URI')
        client = MongoClient(
            mongo_uri,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=5000
        )
        client.admin.command('ping')

        db = _get_database_from_uri(client, mongo_uri)
        app.db = db
        globals()['db'] = db
        print(f"✅ MongoDB'ye başarıyla bağlandı. DB: {db.name}")
        
        # Initialize database schema and indexes
        try:
            init_db_schema(db)
            ActiveGame(db).ensure_indexes()
            Settings(db).ensure_default_settings()
        except Exception as e:
            print(f"⚠️  Schema initialization warning: {e}")

    except ConnectionFailure as e:
        print(f"❌ MongoDB bağlantı hatası: {e}")
        app.db = None
        globals()['db'] = None
        return None

    # CORS - VS Code Dev Tunnels ve tüm origin'ler için
    CORS(app, resources={
        r"/api/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })

    # Blueprint import - multiplayer'dan socketio init fonksiyonunu da al
    from routes.auth import auth_bp
    from routes.game import game_bp
    from routes.admin import admin_bp
    from routes.categories import categories_bp
    from routes.leaderboard import leaderboard_bp
    from routes.daily_tasks import daily_tasks_bp
    from routes.friends import friends_bp
    from routes.messages import messages_bp
    from routes.game_invites import game_invites_bp, init_socketio_invites
    from routes.multiplayer import multiplayer_bp, init_socketio
    
    # SocketIO'yu multiplayer ve game_invites route'larına enjekte et
    init_socketio(socketio)
    init_socketio_invites(socketio)
    # Blueprint'ler
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(game_bp, url_prefix='/api/game')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(categories_bp, url_prefix='/api/categories')
    app.register_blueprint(leaderboard_bp, url_prefix='/api/leaderboard')
    app.register_blueprint(daily_tasks_bp, url_prefix='/api/daily-tasks')
    app.register_blueprint(friends_bp, url_prefix='/api/friends')
    app.register_blueprint(messages_bp, url_prefix='/api/messages')
    app.register_blueprint(game_invites_bp, url_prefix='/api/game-invites')
    app.register_blueprint(multiplayer_bp, url_prefix='/api/multiplayer')

    # Eski/boş recent-games endpoint'leri (frontend kırılmasın diye)
    @app.route('/game/recent-games', methods=['GET'])
    def recent_games_fallback():
        return jsonify({'success': True, 'games': []})

    @app.route('/api/game/recent-games', methods=['GET'])
    def api_recent_games_fallback():
        return jsonify({'success': True, 'games': []})

    # Root health check
    @app.route('/health', methods=['GET'])
    def root_health_check():
        return jsonify({
            'status': 'healthy',
            'service': 'kelime-oyunu-api',
            'timestamp': datetime.now().isoformat(),
            'message': 'Kelime Oyunu API çalışıyor'
        })

    # API health check
    @app.route('/api/health', methods=['GET'])
    def api_health_check():
        try:
            db_status = "disconnected"
            active_games = 0
            if app.db is not None:
                try:
                    app.db.command('ping')
                    db_status = "connected"
                    active_games = app.db.active_games.count_documents({})
                except Exception as e:
                    db_status = f"error: {str(e)}"
            else:
                db_status = "disconnected"

            return jsonify({
                'status': 'healthy',
                'database': db_status,
                'timestamp': datetime.now().isoformat(),
                'active_games': active_games,
                'word_pool': {},
                'settings': {},
                'endpoints': {
                    'auth': '/api/auth',
                    'game': '/api/game',
                    'admin': '/api/admin',
                    'categories': '/api/categories',
                    'leaderboard': '/api/leaderboard'
                }
            })
        except Exception as e:
            return jsonify({
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }), 500

    # Ana sayfa
    @app.route('/')
    def home():
        return jsonify({
            'message': 'Kelime Oyunu API Service',
            'version': '1.0.0',
            'endpoints': {
                'health': '/health',
                'api_health': '/api/health',
                'auth': '/api/auth',
                'game': '/api/game',
                'admin': '/api/admin',
                'categories': '/api/categories',
                'leaderboard': '/api/leaderboard'
            },
            'timestamp': datetime.now().isoformat()
        })

    # Hata handler'ları
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'error': 'Endpoint bulunamadı',
            'message': 'İstediğiniz kaynak mevcut değil',
            'status_code': 404
        }), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            'error': 'Sunucu hatası',
            'message': 'Bir iç sunucu hatası oluştu',
            'status_code': 500
        }), 500

    @app.errorhandler(Exception)
    def handle_exception(error):
        return jsonify({
            'error': 'Beklenmeyen hata',
            'message': str(error),
            'status_code': 500
        }), 500
    
    # SocketIO Event Handlers
    @socketio.on('connect')
    def handle_connect():
        print(f"🔌 Client connected: {request.sid}")
    
    @socketio.on('disconnect')
    def handle_disconnect():
        print(f"🔌 Client disconnected: {request.sid}")
    
    @socketio.on('join_user_room')
    def handle_join_user_room(data):
        """Kullanıcı kendi odasına katılır (bildirimler için)"""
        user_id = data.get('user_id')
        if user_id:
            join_room(f'user_{user_id}')
            print(f"👤 User {user_id} joined room")
    
    @socketio.on('join_game_room')
    def handle_join_game_room(data):
        """Oyuncu multiplayer oyun odasına katılır"""
        game_id = data.get('game_id')
        if game_id:
            join_room(f'game_{game_id}')
            print(f"🎮 Joined game room: {game_id}")

    return app, socketio


if __name__ == '__main__':
    app, socketio = create_app()

    if app is None:
        print("❌ Uygulama başlatılamadı! MongoDB bağlantısı kurulamadı.")
        raise SystemExit(1)

    # Otomatik IP tespiti
    try:
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
    except:
        local_ip = "192.168.x.x"
    
    print("\n" + "="*60)
    print("🎯 KELİME OYUNU BACKEND SERVİSİ")
    print("="*60)
    print("\n⚙️  BİLGİSAYARINIZIN IP ADRESİ:")
    print(f"   📍 {local_ip}")
    print("\n📝 Frontend'de kullanmak için:")
    print(f"   frontend/src/config/env.js dosyasına şunu yazın:")
    print(f"   const DEFAULT_API_URL = 'http://{local_ip}:5000';")
    print("\n📍 Health Check Endpoints:")
    print("   • http://localhost:5000/health")
    print(f"   • http://{local_ip}:5000/health")
    print("\n🌐 API Base URL:")
    print(f"   • http://{local_ip}:5000/api")
    print("\n🔌 WebSocket:")
    print(f"   • ws://{local_ip}:5000")
    print("\n🚀 Server başlatılıyor...")
    print("="*60 + "\n")

    try:
        # SocketIO ile server'ı başlat
        socketio.run(
            app,
            debug=False,
            host='0.0.0.0',
            port=5000,
            allow_unsafe_werkzeug=True
        )
    except KeyboardInterrupt:
        print("\n⏹️  Server durduruluyor...")
    except Exception as e:
        print(f"\n❌ Server başlatılamadı: {e}")
