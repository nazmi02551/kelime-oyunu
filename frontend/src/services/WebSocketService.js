// services/WebSocketService.js
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EventBus from './EventBus';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.userId = null;
  }

  async connect() {
    try {
      // API URL'ini al
      const apiUrl = await AsyncStorage.getItem('apiUrl');
      if (!apiUrl) {
        console.error('❌ API URL bulunamadı');
        return false;
      }

      // Token'ı al
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        console.warn('⚠️  Token bulunamadı, WebSocket bağlantısı kurulmayacak');
        return false;
      }

      // User ID'yi al
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        this.userId = JSON.parse(userData)._id;
      }

      // Socket.IO URL'ini oluştur (base URL, /api olmadan)
      const baseUrl = apiUrl.replace('/api', '');

      // Bağlantı kur
      this.socket = io(baseUrl, {
        transports: ['websocket', 'polling'],
        auth: { token },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts
      });

      this.setupEventListeners();
      
      return true;
    } catch (error) {
      console.error('❌ WebSocket bağlantı hatası:', error);
      return false;
    }
  }

  setupEventListeners() {
    if (!this.socket) return;

    // Bağlantı kuruldu
    this.socket.on('connect', () => {
      console.log('✅ WebSocket bağlantısı kuruldu');
      this.connected = true;
      this.reconnectAttempts = 0;

      // Kullanıcı odasına katıl
      if (this.userId) {
        this.joinUserRoom(this.userId);
      }

      EventBus.emit('websocket:connected');
    });

    // Bağlantı koptu
    this.socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket bağlantısı koptu:', reason);
      this.connected = false;
      EventBus.emit('websocket:disconnected', { reason });
    });

    // Reconnect
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 WebSocket yeniden bağlandı (Deneme: ${attemptNumber})`);
      this.reconnectAttempts = 0;
      EventBus.emit('websocket:reconnected');
    });

    this.socket.on('reconnect_attempt', () => {
      this.reconnectAttempts++;
      console.log(`🔄 Yeniden bağlanma denemesi: ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ WebSocket yeniden bağlanamadı');
      EventBus.emit('websocket:reconnect_failed');
    });

    // Özel eventler
    this.socket.on('game_invite', (data) => {
      console.log('🎮 Oyun daveti alındı:', data);
      EventBus.emit('game:invite_received', data);
    });

    this.socket.on('game_ready', (data) => {
      console.log('🚀 Oyun hazır:', data);
      EventBus.emit('game:ready', data);
    });

    this.socket.on('game_update', (data) => {
      console.log('🔄 Oyun güncellendi:', data);
      EventBus.emit('game:update', data);
    });

    this.socket.on('friend_request', (data) => {
      console.log('👥 Arkadaşlık isteği:', data);
      EventBus.emit('friend:request_received', data);
    });

    this.socket.on('message_received', (data) => {
      console.log('💬 Mesaj alındı:', data);
      EventBus.emit('message:received', data);
    });
  }

  // Kullanıcı odasına katıl
  joinUserRoom(userId) {
    if (!this.socket || !this.connected) return;
    
    this.socket.emit('join_user_room', { user_id: userId });
    console.log(`👤 Kullanıcı odasına katılındı: ${userId}`);
  }

  // Oyun odasına katıl
  joinGameRoom(gameId) {
    if (!this.socket || !this.connected) return;

    this.socket.emit('join_game_room', { game_id: gameId });
    console.log(`🎮 Oyun odasına katılındı: ${gameId}`);
  }

  // Oyun odasından ayrıl
  leaveGameRoom(gameId) {
    if (!this.socket || !this.connected) return;

    this.socket.emit('leave_room', `game_${gameId}`);
    console.log(`🚪 Oyun odasından ayrıldı: ${gameId}`);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      console.log('🔌 WebSocket bağlantısı kapatıldı');
    }
  }

  isConnected() {
    return this.connected && this.socket && this.socket.connected;
  }
}

// Singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;
