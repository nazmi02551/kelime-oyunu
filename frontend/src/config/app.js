// frontend/src/config/app.js
import { Platform } from 'react-native';

class AppConfig {
  constructor() {
    this.config = {
      // API Base URL'ler - Öncelik sırasına göre denenir
      // Yeni bir IP eklemek için buraya ekleyin
      apiUrls: [
        // Güncel network IP'niz (hotspot/farklı ağlar için)
        'http://192.168.43.229:5000/api',
        
        // Eski network IP
        'http://192.168.18.6:5000/api',
        
        // Localhost (web tarayıcı için)
        'http://localhost:5000/api',
        'http://127.0.0.1:5000/api',
      ],
      
      // App Ayarları
      app: {
        name: 'Kelime Oyunu',
        version: '1.0.0',
        timeout: 15000,
        maxRetries: 3
      },
      
      // Feature Flags
      features: {
        leaderboard: true,
        adminPanel: true,
        userProfiles: true,
        multiplayer: false // Örnek feature flag
      }
    };
  }

  // Otomatik olarak çalışan API URL'sini bul
  async findWorkingApiUrl() {
    console.log('🔍 Çalışan API URL aranıyor...');
    
    for (const url of this.config.apiUrls) {
      try {
        console.log(`🔄 Denenen URL: ${url}`);
        // Probe the real API health endpoint (ensure we hit /api/health)
        const probeUrl = url.endsWith('/') ? `${url}health` : `${url}/health`;
        const response = await fetch(probeUrl, { method: 'GET' });

        // Avoid false positives from HTML proxy pages by checking content-type
        const contentType = response.headers.get('content-type') || '';
        if (response.ok && contentType.includes('application/json')) {
          console.log(`✅ Çalışan API URL bulundu: ${url}`);
          return url;
        } else {
          console.log(`ℹ️ URL yanıt verdi ama JSON değil veya başarısız: ${url} (status=${response.status}, content-type=${contentType})`);
        }
      } catch (error) {
        console.log(`❌ URL çalışmıyor: ${url}`, error?.message || error);
        continue;
      }
    }
    
    throw new Error('❌ Hiçbir API URL çalışmıyor!');
  }

  getConfig() {
    return this.config;
  }

  // Environment-based config
  getEnvConfig() {
    return {
      isDevelopment: __DEV__,
      isWeb: Platform.OS === 'web',
      isMobile: Platform.OS !== 'web'
    };
  }
}

export default new AppConfig();