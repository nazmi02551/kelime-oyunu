# WEBSOCKET DEBUG KONTROL LİSTESİ

## 1. Backend Log Kontrolü
Backend terminalinde şunları arayın:
- `🔌 Client connected:` - WebSocket bağlanıyor mu?
- `👤 User {user_id} joined room` - User room'a katılıyor mu?
- `🎮 Joined game room:` - Game room'a katılıyor mu?
- `📨 WebSocket: invite_accepted to user_` - Event emit ediliyor mu?

## 2. Frontend Console Kontrolü  
React Native Debugger veya Metro bundler'da:
- `✅ WebSocket bağlandı:` - Bağlantı başarılı mı?
- `🎮 Oyun odasına katılındı:` - Room join oldu mu?
- `📨 Davet kabul edildi:` - Event geldi mi?
- `🔄 Oyun güncellendi:` - Game update geliyor mu?

## 3. Test Senaryosu
1. **İki cihaz/tarayıcı aç** (User A ve User B)
2. User A'dan B'ye oyun daveti gönder
3. Backend'de: `📨 WebSocket: invite_accepted to user_XXX` görünmeli
4. User A'da bildirim gelmeli ve oyun başlamalı
5. Oyun sırasında cevap verince puanlar güncellenmeli
6. Bir oyuncu iptal edince diğeri bildirim almalı

## 4. WebSocket Çalışmıyorsa
Eğer hiçbir WebSocket logu yoksa:
- SocketIO version uyumsuzluğu olabilir
- CORS sorunu olabilir  
- Frontend'de token eksik olabilir

Düzeltme:
```python
# backend/app.py'de
socketio = SocketIO(
    app,
    cors_allowed_origins="*",  # ✅ Zaten var
    async_mode='threading',     # ✅ Zaten var
    logger=True,                # ❌ False'du, True yap!
    engineio_logger=True        # ❌ False'du, True yap!
)
```

## 5. Hızlı Test
Terminal'de:
```powershell
# Backend'i yeniden başlat
cd d:\kelime-oyunu\backend
.\.venv\Scripts\python.exe app.py
```

Frontend'de kullanıcı giriş yaptıktan sonra console'da:
```
✅ WebSocket bağlandı: XXXXX
```
mesajını görmeli.
