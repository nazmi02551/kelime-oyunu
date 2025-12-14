from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from datetime import datetime
from urllib.parse import urlparse
import os

from routes.auth import auth_bp
from routes.game import game_bp
from routes.admin import admin_bp
from routes.categories import categories_bp
from routes.leaderboard import leaderboard_bp
from routes.daily_tasks import daily_tasks_bp
from routes.friends import friends_bp
from routes.messages import messages_bp
from routes.game_invites import game_invites_bp
from config import Config
from init_db_schema import init_db_schema
from models.active_game import ActiveGame
from models.settings import Settings


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
    app = Flask(__name__)
    app.config.from_object(Config)

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

    # CORS
    CORS(app, resources={r"/api/*": {"origins": "*"}})

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

    return app


if __name__ == '__main__':
    app = create_app()

    if app is None:
        print("❌ Uygulama başlatılamadı! MongoDB bağlantısı kurulamadı.")
        raise SystemExit(1)

    print("\n" + "="*60)
    print("🎯 KELİME OYUNU BACKEND SERVİSİ")
    print("="*60)
    print("📍 Health Check Endpoints:")
    print("   • http://localhost:5000/health")
    print("   • http://localhost:5000/api/health")
    print("\n🌐 API Endpoints:")
    print("   • Auth:       http://localhost:5000/api/auth")
    print("   • Game:       http://localhost:5000/api/game")
    print("   • Admin:      http://localhost:5000/api/admin")
    print("   • Categories: http://localhost:5000/api/categories")
    print("   • Leaderboard: http://localhost:5000/api/leaderboard")
    print("\n📱 Telefondan Erişim:")
    print("   • http://192.168.43.229000/health")
    print("\n🚀 Server başlatılıyor...")
    print("="*60 + "\n")

    try:
        app.run(
            debug=True,
            host='0.0.0.0',
            port=5000,
            threaded=True
        )
    except KeyboardInterrupt:
        print("\n⏹️  Server durduruluyor...")
    except Exception as e:
        print(f"\n❌ Server başlatılamadı: {e}")
