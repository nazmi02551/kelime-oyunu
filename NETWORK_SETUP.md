# 🌐 Ağ Yapılandırması Rehberi

## 📍 IP Adresi Değiştirme

### 1️⃣ Backend'i Başlatın
```bash
cd backend
.\.venv\Scripts\Activate.ps1  # Windows
python app.py
```

Backend başladığında **bilgisayarınızın IP adresini** otomatik gösterir:
```
⚙️ BİLGİSAYARINIZIN IP ADRESİ:
   📍 192.168.43.229
```

### 2️⃣ Frontend'e IP Ekleyin

**Dosya:** `frontend/src/config/app.js` (Satır 9-18)

```javascript
apiUrls: [
  'http://192.168.43.229:5000/api',  // ⬅️ YENİ IP'NİZİ BURAYA EKLEYİN
  'http://192.168.18.6:5000/api',    // Eski IP'ler
  'http://localhost:5000/api',
  'http://127.0.0.1:5000/api',
],
```

**Önemli:** Port numarasını `:5000` ve `/api` eklemeyi unutmayın!

### 3️⃣ Frontend'i Yeniden Başlatın
```bash
# Metro bundler'ı durdurun (Ctrl+C)
cd frontend
npm start

# Tarayıcıda: Ctrl+Shift+R (hard refresh)
```

---

## 🎤 Mikrofon Sorunu (HTTPS Gereksinimi)

### ❌ Sorun
IP adresi ile erişimde mikrofon çalışmaz:
```
http://192.168.43.229:8081  ❌ Güvenli değil
```

### ✅ Çözümler

#### **Seçenek 1: Localhost Kullanın (En Kolay)**
Backend aynı bilgisayarda olduğu için:
```
http://localhost:8081  ✅ Çalışır!
```

**Avantaj:** Mikrofon izni sorunsuz çalışır  
**Dezavantaj:** Telefon/tablet üzerinden test edemezsiniz

#### **Seçenek 2: HTTPS Tunnel (ngrok) - Telefon İçin** ⭐ ÖNERİLEN
Telefonda test etmek için HTTPS gerekir. VS Code port forwarding sorunlu olabilir, ngrok daha stabil:

1. **ngrok İndirin:** https://ngrok.com/download
2. **Backend için tunnel açın (yeni terminal):**
   ```bash
   ngrok http 5000
   ```
3. **Ekranda gösterilen URL'yi kopyalayın:**
   ```
   Forwarding   https://abc123.ngrok.io -> http://localhost:5000
   ```
4. **Frontend `env.js` güncelleyin:**
   ```javascript
   const DEFAULT_API_URL = 'https://abc123.ngrok.io';
   ```
5. **Frontend'i yeniden başlatın ve tarayıcıyı yenileyin**

**Avantaj:** 
- ✅ Telefon/tablet çalışır, HTTPS var
- ✅ Mikrofon izni sorunsuz
- ✅ VS Code auth sorunu yok
- ✅ Hızlı ve stabil

**Dezavantaj:** 
- ⚠️ Her seferinde yeni URL (ücretsiz plan)
- ⚠️ ngrok arka planda çalışmalı

#### **Seçenek 3: Sesli Modu Devre Dışı Bırakın**
Mikrofon gerekmiyorsa:

**Dosya:** `frontend/src/screens/GameScreen.js`

Sesli mod butonunu gizleyin veya:
```javascript
const [voiceInputEnabled, setVoiceInputEnabled] = useState(false); // true yerine false
```

---

## 🔧 Hızlı Kontrol Listesi

### Backend Çalışıyor mu?
```bash
curl http://192.168.43.229:5000/health
# veya tarayıcıda: http://192.168.43.229:5000/health
```

Beklenen cevap:
```json
{"message": "Service is running", "status": "healthy"}
```

### Frontend Doğru IP'yi Kullanıyor mu?
Tarayıcı konsolu (F12) açın:
```javascript
// Network tab'da request URL'leri kontrol edin
// http://192.168.43.229:5000/api/... görmelisiniz
```

### Mikrofon İzni Var mı?
Chrome: `chrome://settings/content/microphone`  
Engellenenler listesinden silin: `http://192.168.43.229:8081`

---

## 📱 Mobil Cihazdan Bağlanma

### Android/iOS (Aynı WiFi)
1. Backend'in IP'sini öğrenin (ör: 192.168.43.229)
2. `app.js` dosyasına IP ekleyin
3. Telefon tarayıcısında: `http://192.168.43.229:8081`

**Not:** Mikrofon telefonda da HTTPS gerektir! ngrok kullanın.

### Hotspot Üzerinden
1. Bilgisayardan hotspot açın
2. Telefonu hotspot'a bağlayın
3. Backend'deki IP'yi kullanın
4. HTTPS için ngrok gerekir

---

## 🆘 Yaygın Hatalar

### ❌ "WebSocket connection failed"
**Neden:** Backend çalışmıyor veya IP yanlış  
**Çözüm:** `python app.py` çalıştırın, IP'yi kontrol edin

### ❌ "Mikrofon izni reddedildi"
**Neden:** HTTP + IP adresi = güvensiz bağlantı  
**Çözüm:** `localhost` kullanın veya ngrok ile HTTPS aktifleştirin

### ❌ "CORS error"
**Neden:** Backend CORS ayarları yanlış  
**Çözüm:** `backend/app.py` içinde CORS zaten ayarlanmış olmalı:
```python
CORS(app, resources={r"/api/*": {"origins": "*"}})
```

---

## 📝 Özet: En Hızlı Yöntem

### Sadece Kendiniz Test Edecekseniz:
1. Backend: `python app.py`
2. Frontend: `http://localhost:8081`
3. Mikrofon: ✅ Çalışır!

### Telefon/Tablet Test Edecekseniz:
1. Backend: `python app.py` (IP'yi not alın)
2. ngrok: `ngrok http 5000` (HTTPS URL alın)
3. `env.js`: ngrok URL'yi yazın
4. Telefon: ngrok URL'yi açın
5. Mikrofon: ✅ Çalışır!

---

**Son Güncelleme:** 16 Aralık 2025  
**Hazırlayan:** GitHub Copilot 🤖
