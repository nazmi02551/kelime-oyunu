import { io } from 'socket.io-client';
import ENV from '../config/env';

// Web için AsyncStorage yerine localStorage wrapper
const storage = {
  getItem: async (key) => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error('localStorage getItem error:', e);
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('localStorage setItem error:', e);
    }
  }
};

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.reconnecting = false;
  }

  async connect() {
    try {
      if (this.socket && this.connected) {
        console.log('✅ Socket zaten bağlı');
        return this.socket;
      }

      const token = await storage.getItem('token');
      if (!token) {
        console.warn('⚠️ Token bulunamadı, socket bağlantısı yapılamıyor');
        return null;
      }

      // Backend 'id' kullanıyor, 'userId' değil
      const userDataStr = await storage.getItem('user');
      let userId = null;
      if (userDataStr) {
        try {
          const userData = JSON.parse(userDataStr);
          userId = userData.id;
        } catch (e) {
          console.error('User data parse hatası:', e);
        }
      }

      console.log('🔌 WebSocket bağlantısı kuruluyor..., User ID:', userId);

      // Socket.IO bağlantısı
      this.socket = io(ENV.apiUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        auth: {
          token: token
        }
      });

      // Promise ile bağlantıyı bekle
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.warn('⚠️ WebSocket bağlantı zaman aşımı');
          resolve(this.socket);
        }, 5000);

        // Bağlantı eventleri
        this.socket.on('connect', () => {
          clearTimeout(timeout);
          console.log('✅ WebSocket bağlandı:', this.socket.id);
          this.connected = true;
          this.reconnecting = false;
          
          // Kullanıcı odasına katıl
          if (userId) {
            console.log('👤 User room\'a katılıyor:', userId);
            this.socket.emit('join_user_room', { user_id: userId });
          }
          
          resolve(this.socket);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('❌ WebSocket bağlantısı kesildi:', reason);
          this.connected = false;
          
          if (reason === 'io server disconnect') {
            // Sunucu bağlantıyı kesti, manuel yeniden bağlan
            this.socket.connect();
          }
        });

        this.socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          console.error('❌ WebSocket bağlantı hatası:', error.message);
          this.connected = false;
          resolve(null); // Hata durumunda null döndür, reject etme
        });

        this.socket.on('reconnect', (attemptNumber) => {
          console.log(`✅ WebSocket yeniden bağlandı (deneme: ${attemptNumber})`);
          this.reconnecting = false;
          
          // Yeniden bağlanınca user room'a tekrar katıl
          if (userId) {
            console.log('👤 Yeniden bağlanma sonrası user room\'a katılıyor:', userId);
            this.socket.emit('join_user_room', { user_id: userId });
          }
        });

        this.socket.on('reconnect_attempt', (attemptNumber) => {
          console.log(`🔄 WebSocket yeniden bağlanıyor (deneme: ${attemptNumber})`);
          this.reconnecting = true;
        });
      });
      
    } catch (error) {
      console.error('❌ Socket bağlantı hatası:', error);
      return null;
    }
  }

  disconnect() {
    if (this.socket) {
      console.log('🔌 WebSocket bağlantısı kapatılıyor');
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  // Oyun odasına katıl
  joinGameRoom(gameId) {
    if (this.socket && this.connected) {
      console.log(`🎮 Oyun odasına katılıyor: ${gameId}`);
      this.socket.emit('join_game_room', { game_id: gameId });
    }
  }

  // Event dinleyici ekle
  on(eventName, callback) {
    if (this.socket) {
      this.socket.on(eventName, callback);
    }
  }

  // Event dinleyici kaldır
  off(eventName, callback) {
    if (this.socket) {
      this.socket.off(eventName, callback);
    }
  }

  // Tek seferlik event dinleyici
  once(eventName, callback) {
    if (this.socket) {
      this.socket.once(eventName, callback);
    }
  }

  // Event gönder
  emit(eventName, data) {
    if (this.socket && this.connected) {
      this.socket.emit(eventName, data);
    } else {
      console.warn(`⚠️ Socket bağlı değil, event gönderilemedi: ${eventName}`);
    }
  }

  isConnected() {
    return this.connected && this.socket && this.socket.connected;
  }
}

// Singleton instance
const socketService = new SocketService();

export default socketService;
