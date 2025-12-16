# 🎯 Kelime Oyunu - GitHub Copilot Instructions

Bu proje için özel talimatlar ve standartlar.

---

## 📋 Proje Özeti

**Kelime Oyunu** - Çok oyunculu kelime tahmin oyunu (web + mobil cross-platform)

- **Backend:** Flask + Flask-SocketIO (Python)
- **Frontend:** React Native Web + Expo
- **Database:** MongoDB
- **Real-time:** Socket.IO (WebSocket)
- **Platform:** Web tarayıcı + Android/iOS (Expo ile)

---

## 🏗️ Mimari ve Yapı

### Backend (`/backend/`)
```
backend/
├── app.py                 # Ana Flask uygulaması, SocketIO
├── config.py             # Environment config
├── models/               # MongoDB modelleri
│   ├── user.py          # Kullanıcı
│   ├── friendship.py    # Arkadaşlık sistemi
│   ├── multiplayer_game.py
│   └── ...
├── routes/              # API endpoint'ler
│   ├── auth.py         # /api/auth/*
│   ├── game.py         # /api/game/*
│   ├── friends.py      # /api/friends/*
│   └── ...
└── services/           # İş mantığı
    ├── leaderboard.py
    └── difficulty_adapter.py
```

### Frontend (`/frontend/src/`)
```
frontend/src/
├── screens/            # Ana ekranlar
│   ├── GameScreen.js
│   ├── LoginScreen.js
│   ├── FriendsScreen.js
│   └── ...
├── components/         # Reusable component'ler
├── context/           # React Context (Auth, Theme, Notification)
├── services/          # API, Socket, Sound manager'lar
│   ├── api.js
│   ├── SocketService.js
│   └── WebSocketService.js
├── config/           # Environment config
│   ├── env.js       # API URL (VS Code dev tunnels)
│   └── app.js       # Uygulama config
└── utils/           # Helper fonksiyonlar
```

---

## 🔧 Teknoloji Stack

### Backend
- **Framework:** Flask 2.3+
- **WebSocket:** Flask-SocketIO + eventlet
- **Database:** MongoDB (PyMongo)
- **Auth:** JWT tokens (localStorage)
- **CORS:** flask-cors (tüm origin'lere açık)

### Frontend
- **Framework:** React Native Web (Expo)
- **Navigation:** Custom AppNavigator
- **State:** React Context API
- **Styling:** StyleSheet + inline styles
- **Cross-platform:** Web, Android, iOS (tek kod tabanı)
- **Gradients:** expo-linear-gradient + CSS linear-gradient
- **Audio:** expo-speech, SoundManager
- **Voice Input:** Web Speech API (HTTPS gerekli)

### Development
- **Port Forwarding:** VS Code Dev Tunnels (HTTPS)
- **Backend:** http://localhost:5000 → https://xxx-5000.euw.devtunnels.ms
- **Frontend:** http://localhost:8081 → https://xxx-8081.euw.devtunnels.ms

---

## 📐 Kod Standartları

### Genel
- **Dil:** Türkçe yorum ve console.log mesajları
- **Değişken İsimleri:** İngilizce (camelCase)
- **Dosya İsimleri:** PascalCase (component'ler), camelCase (utility)
- **Girinti:** 2 space (JavaScript), 4 space (Python)

### React Native
```javascript
// ✅ Doğru
const MyComponent = () => {
  const [isLoading, setIsLoading] = useState(false);
  
  // Türkçe yorum
  const handleSubmit = async () => {
    console.log('🚀 Form gönderiliyor...');
  };
  
  return <View style={styles.container}>...</View>;
};

// ❌ Yanlış
const myComponent = () => { // PascalCase olmalı
  var loading = false; // var kullanma, const/let tercih et
  
  return <View style={{padding: 10}}>...</View>; // Inline style yerine StyleSheet
};
```

### Python
```python
# ✅ Doğru
def get_user_by_id(user_id: str) -> Optional[dict]:
    """Kullanıcı ID'sine göre kullanıcı bilgisi döner."""
    try:
        user = db.users.find_one({'_id': ObjectId(user_id)})
        print(f"✅ Kullanıcı bulundu: {user_id}")
        return user
    except Exception as e:
        print(f"❌ Hata: {e}")
        return None

# ❌ Yanlış
def GetUser(id): # snake_case olmalı, type hint yok
    user = db.users.find_one({'_id': ObjectId(id)}) # hata yönetimi yok
    return user
```

---

## 🎨 UI/UX Standartları

### Responsive Design
- **Touch Target:** Minimum 44x44px (mobil)
- **Padding:** 12-20px (ekran kenarları)
- **ScrollView:** `contentContainerStyle={{ flexGrow: 1 }}` kullan
- **Loading:** ActivityIndicator + SkeletonLoader

### Renkler (`/frontend/src/utils/colors.js`)
```javascript
export const colors = {
  primary: '#667eea',
  secondary: '#764ba2',
  success: '#2ecc71',
  danger: '#e74c3c',
  warning: '#f39c12',
  // ...
};
```

### Gradients
```javascript
// Web
<View style={{ backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }} />

// Native
import { LinearGradient } from 'expo-linear-gradient';
<LinearGradient colors={['#667eea', '#764ba2']} />

// Cross-platform Component
<GradientView colors={['#667eea', '#764ba2']}>...</GradientView>
```

### Icons
- Emoji kullan: 🎮 🏆 ⚙️ 👤 💬 (native font, dependency yok)

---

## 🔐 Authentication

### Token Yönetimi
- **Storage:** `localStorage` (Web + React Native Web uyumlu)
- **Token Key:** `'authToken'`
- **Süre:** Backend'de JWT exp kontrolü

```javascript
// ✅ Doğru kullanım
import { AuthContext } from '../context/AuthContext';

const MyScreen = () => {
  const { user, token, signOut } = useContext(AuthContext);
  
  if (!user) return <LoginScreen />;
  // ...
};
```

### API Calls
```javascript
// api.js otomatik token ekler
import api from '../services/api';

const response = await api.get('/game/start');
// Authorization: Bearer {token} otomatik eklenir
```

---

## 🔌 WebSocket/Socket.IO

### Backend Events
```python
@socketio.on('join_game')
def handle_join_game(data):
    user_id = data.get('user_id')
    game_id = data.get('game_id')
    join_room(game_id)
    emit('game_joined', {'game_id': game_id}, room=game_id)
```

### Frontend Usage
```javascript
import SocketService from '../services/SocketService';

SocketService.connect(userId);
SocketService.emit('join_game', { user_id: userId, game_id: gameId });
SocketService.on('game_joined', (data) => {
  console.log('🎮 Oyuna katıldı:', data);
});
```

---

## 🌐 Environment & Config

### Backend URL (`/frontend/src/config/env.js`)
```javascript
const DEFAULT_API_URL = 'https://xxx-5000.euw.devtunnels.ms';
```

**Değiştirme:**
1. VS Code PORTS sekmesinde port 5000 forward et
2. Forwarded Address'i kopyala
3. `env.js` dosyasına yapıştır
4. Metro bundler'ı yeniden başlat

### API URL Listesi (`/frontend/src/config/app.js`)
Otomatik failover için:
```javascript
apiUrls: [
  'https://xxx-5000.euw.devtunnels.ms/api',  // VS Code tunnel
  'http://192.168.43.229:5000/api',         // Hotspot IP
  'http://localhost:5000/api',              // Localhost
],
```

---

## 🧪 Test & Debug

### Console Logging
```javascript
// ✅ Emoji kullan, açıklayıcı ol
console.log('🚀 Oyun başlatılıyor...');
console.error('❌ API hatası:', error);
console.warn('⚠️ Eksik parametre:', data);

// ❌ Sade log'lar
console.log('starting game');
console.log(error);
```

### Error Handling
```javascript
// ✅ Her API call'da try-catch
try {
  const response = await api.post('/game/answer', { answer });
  console.log('✅ Cevap gönderildi');
} catch (error) {
  console.error('❌ Cevap gönderme hatası:', error);
  setGameMessage({ type: 'error', text: 'Bağlantı hatası' });
}
```

---

## 📦 Dependencies

### Backend (`requirements.txt`)
- flask
- flask-cors
- flask-socketio
- pymongo
- python-dotenv
- eventlet

### Frontend (`package.json`)
- react-native-web
- expo
- expo-linear-gradient
- expo-speech
- socket.io-client

---

## 🚀 Deployment & Running

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1  # Windows
pip install -r requirements.txt
python app.py  # Port 5000
```

### Frontend
```bash
cd frontend
npm install
npm start  # Port 8081
```

### VS Code Port Forwarding
1. PORTS sekmesinde port ekle (5000, 8081)
2. Visibility: **Public**
3. URL'leri `env.js`'ye ekle

---

## 🔒 Security & HTTPS

### Mikrofon İzni
- **Gereksinim:** HTTPS veya localhost
- **Çözüm:** VS Code dev tunnels (otomatik HTTPS)
- **Kontrol:** `window.isSecureContext` kontrolü ekli

### CORS
- Backend: `CORS(app, resources={r"/api/*": {"origins": "*"}})`
- Development ortamında tüm origin'lere açık

---

## 🎯 Best Practices

### 1. Component Yapısı
- Fonksiyonel component'ler kullan (hooks)
- Memoization: `React.memo()`, `useMemo()`, `useCallback()`
- Props destructuring yap

### 2. State Management
- Local state: `useState`
- Global state: Context API (AuthContext, NotificationContext)
- WebSocket state: SocketService singleton

### 3. File Organization
- Her screen kendi dosyası
- Styles: StyleSheet.create() (dosya sonunda)
- Reusable logic: Custom hooks

### 4. Performance
- `FlatList` için `keyExtractor` kullan
- `ScrollView` yerine `FlatList` (büyük listeler)
- Image lazy loading
- Debounce kullan (search input'lar)

### 5. Accessibility
- TouchableOpacity'ye `accessibilityLabel` ekle
- Minimum 44x44px touch target
- Color contrast ratio >4.5:1

---

## 🐛 Common Issues

### ❌ "WebSocket connection failed"
**Çözüm:** Backend çalışmıyor, `python app.py` çalıştır

### ❌ "Mikrofon izni reddedildi"
**Çözüm:** HTTP bağlantı, VS Code dev tunnels ile HTTPS kullan

### ❌ "Token expired"
**Çözüm:** `signOut()` çağır, kullanıcıyı login'e yönlendir

### ❌ "CORS error"
**Çözüm:** Backend CORS ayarlarını kontrol et, origin'e izin ver

---

## 📝 Git Workflow

### Branch Strategy
- `main`: Production
- `fixes-and-improvements-dec14`: Current development

### Commit Messages
```
feat: Add voice input to GameScreen
fix: Resolve X button not showing on friend requests
refactor: Extract GradientView to separate component
docs: Update NETWORK_SETUP.md with VS Code tunnels
```

### Before Commit
1. Tüm console.error'ları gözden geçir
2. Unused imports temizle
3. Test et (login → game → friends flow)

---

## 📞 Support & Context

**Token Limit:** ~1M tokens per conversation
**Last Updated:** December 16, 2025
**Maintainer:** @nazmi02551

**Quick Context Recovery:**
```
"fixes-and-improvements-dec14 branch'indeyiz. VS Code dev tunnels 
ile HTTPS yapılandırması tamamlandı. Son değişiklikler: X button 
fix, notification z-index, MessagesScreen gradient header."
```

---

**Bu talimatlar projeye özgüdür. Tüm kod üretimi ve öneriler bu standartlara uymalıdır.** 🚀
