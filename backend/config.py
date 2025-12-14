#backend/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # JWT ve Database
    SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'fallback-secret-key-change-in-production')
    MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/kelime_oyunu')
    
    # CORS ve API Ayarları
    CORS_ORIGINS = "*"
    
    #CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')
    API_PREFIX = '/api'
    
    # Sunucu Ayarları
    HOST = os.environ.get('HOST', '0.0.0.0')
    PORT = int(os.environ.get('PORT', 5000))
    DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    # Frontend URL'leri
    FRONTEND_URLS = [
        'http://localhost:8081',
        'http://192.168.43.229:8081',
        'https://c0b7xhsw-8081.euw.devtunnels.ms',
        'http://c0b7xhsw-8081.euw.devtunnels.ms',
        # Buraya diğer test URL'lerinizi ekleyin
    ]