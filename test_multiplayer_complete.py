"""
Multiplayer Oyun Test Script'i
WebSocket, Davet, Oyun ve İptal işlemlerini test eder
"""
import requests
import time
import json
import socketio
from datetime import datetime

BASE_URL = "http://localhost:5000"
API_BASE = f"{BASE_URL}/api"

# Test kullanıcıları
USER1 = {"email": "deneme1@deneme1.com", "password": "deneme1123"}
USER2 = {"email": "deneme2@deneme2.com", "password": "deneme2123"}

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def log(message, color=Colors.RESET):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"{color}[{timestamp}] {message}{Colors.RESET}")

def log_success(message):
    log(f"✅ {message}", Colors.GREEN)

def log_error(message):
    log(f"❌ {message}", Colors.RED)

def log_warning(message):
    log(f"⚠️  {message}", Colors.YELLOW)

def log_info(message):
    log(f"ℹ️  {message}", Colors.CYAN)

def log_step(message):
    log(f"🔷 {message}", Colors.BOLD + Colors.BLUE)

class TestUser:
    def __init__(self, email, password, name):
        self.email = email
        self.password = password
        self.name = name
        self.token = None
        self.user_id = None
        self.username = None
        self.sio = socketio.Client(logger=False, engineio_logger=False)
        self.websocket_events = []
        
    def login(self):
        log_step(f"{self.name} giriş yapıyor...")
        try:
            response = requests.post(
                f"{API_BASE}/auth/login",
                json={"email": self.email, "password": self.password}
            )
            
            if response.status_code == 200 and response.json().get('token'):
                self.token = response.json()['token']
                self.user_id = response.json()['user']['id']  # Backend 'id' kullanıyor, 'user_id' değil
                self.username = response.json()['user']['username']
                log_success(f"{self.name} giriş başarılı - User ID: {self.user_id}, Username: {self.username}")
                return True
            else:
                log_error(f"{self.name} giriş başarısız: {response.json()}")
                return False
        except Exception as e:
            log_error(f"{self.name} giriş hatası: {e}")
            return False
    
    def connect_websocket(self):
        log_step(f"{self.name} WebSocket bağlanıyor...")
        try:
            # Event handlers
            @self.sio.on('connect')
            def on_connect():
                log_success(f"{self.name} WebSocket bağlandı - SID: {self.sio.sid}")
                # User room'a katıl
                self.sio.emit('join_user_room', {'user_id': self.user_id})
                log_info(f"{self.name} user room'a katıldı")
            
            @self.sio.on('disconnect')
            def on_disconnect():
                log_warning(f"{self.name} WebSocket bağlantısı kesildi")
            
            @self.sio.on('invite_accepted')
            def on_invite_accepted(data):
                log_success(f"{self.name} 📨 DAVET KABUL EDİLDİ: {data}")
                self.websocket_events.append(('invite_accepted', data))
            
            @self.sio.on('game_started')
            def on_game_started(data):
                log_success(f"{self.name} 🚀 OYUN BAŞLADI: {data}")
                self.websocket_events.append(('game_started', data))
            
            @self.sio.on('game_update')
            def on_game_update(data):
                log_info(f"{self.name} 🔄 Oyun güncellendi: {data.get('game_id', 'N/A')}")
                self.websocket_events.append(('game_update', data))
            
            @self.sio.on('game_cancelled')
            def on_game_cancelled(data):
                log_warning(f"{self.name} ❌ OYUN İPTAL EDİLDİ: {data}")
                self.websocket_events.append(('game_cancelled', data))
            
            @self.sio.on('game_ready')
            def on_game_ready(data):
                log_info(f"{self.name} ✅ Oyuncu hazır: {data}")
                self.websocket_events.append(('game_ready', data))
            
            # Bağlan
            self.sio.connect(
                BASE_URL,
                auth={'token': self.token},
                transports=['websocket', 'polling']
            )
            
            time.sleep(1)  # Bağlantı kurulsun
            return self.sio.connected
            
        except Exception as e:
            log_error(f"{self.name} WebSocket bağlantı hatası: {e}")
            return False
    
    def get_headers(self):
        return {'Authorization': f'Bearer {self.token}'}
    
    def send_game_invite(self, to_username):
        log_step(f"{self.name} → {to_username} oyun daveti gönderiyor...")
        try:
            response = requests.post(
                f"{API_BASE}/game-invites/send",
                headers=self.get_headers(),
                json={
                    'to_username': to_username,
                    'game_settings': {'question_count': 5}
                }
            )
            
            if response.status_code == 200 and response.json().get('success'):
                invite_id = response.json().get('invite_id')
                log_success(f"{self.name} davet gönderdi - Invite ID: {invite_id}")
                return invite_id
            else:
                log_error(f"{self.name} davet gönderilemedi: {response.json()}")
                return None
        except Exception as e:
            log_error(f"{self.name} davet gönderme hatası: {e}")
            return None
    
    def get_pending_invites(self):
        try:
            response = requests.get(
                f"{API_BASE}/game-invites/pending",
                headers=self.get_headers()
            )
            if response.status_code == 200:
                invites = response.json().get('invites', [])
                log_info(f"{self.name} {len(invites)} adet davet bekliyor")
                return invites
            return []
        except Exception as e:
            log_error(f"{self.name} davet listesi alınamadı: {e}")
            return []
    
    def accept_invite(self, invite_id):
        log_step(f"{self.name} daveti kabul ediyor...")
        try:
            response = requests.post(
                f"{API_BASE}/game-invites/respond/{invite_id}",
                headers=self.get_headers(),
                json={'accept': True}
            )
            
            if response.status_code == 200 and response.json().get('success'):
                game_id = response.json().get('game_id')
                log_success(f"{self.name} daveti kabul etti - Game ID: {game_id}")
                return game_id
            else:
                log_error(f"{self.name} davet kabul edilemedi: {response.json()}")
                return None
        except Exception as e:
            log_error(f"{self.name} davet kabul hatası: {e}")
            return None
    
    def join_game_room(self, game_id):
        log_info(f"{self.name} game room'a katılıyor: {game_id}")
        self.sio.emit('join_game_room', {'game_id': game_id})
    
    def set_ready(self, game_id):
        log_step(f"{self.name} hazır oluyor...")
        try:
            response = requests.post(
                f"{API_BASE}/multiplayer/ready/{game_id}",
                headers=self.get_headers()
            )
            
            if response.status_code == 200 and response.json().get('success'):
                log_success(f"{self.name} hazır!")
                return True
            else:
                log_error(f"{self.name} hazır olma başarısız: {response.json()}")
                return False
        except Exception as e:
            log_error(f"{self.name} hazır olma hatası: {e}")
            return False
    
    def get_game(self, game_id):
        try:
            response = requests.get(
                f"{API_BASE}/multiplayer/game/{game_id}",
                headers=self.get_headers()
            )
            if response.status_code == 200 and response.json().get('success'):
                return response.json()['game']
            return None
        except Exception as e:
            log_error(f"{self.name} oyun bilgisi alınamadı: {e}")
            return None
    
    def submit_answer(self, game_id, question_index, answer):
        try:
            response = requests.post(
                f"{API_BASE}/multiplayer/answer/{game_id}",
                headers=self.get_headers(),
                json={
                    'question_index': question_index,
                    'answer': answer,
                    'time_taken': 5
                }
            )
            
            if response.status_code == 200 and response.json().get('success'):
                result = response.json()
                is_correct = result.get('is_correct', False)
                status = "✓ DOĞRU" if is_correct else "✗ YANLIŞ"
                log_info(f"{self.name} cevap gönderdi: {status}")
                return result
            else:
                log_error(f"{self.name} cevap gönderilemedi: {response.json()}")
                return None
        except Exception as e:
            log_error(f"{self.name} cevap gönderme hatası: {e}")
            return None
    
    def cancel_game(self, game_id):
        log_step(f"{self.name} oyunu iptal ediyor...")
        try:
            response = requests.post(
                f"{API_BASE}/multiplayer/cancel/{game_id}",
                headers=self.get_headers()
            )
            
            if response.status_code == 200 and response.json().get('success'):
                log_success(f"{self.name} oyunu iptal etti")
                return True
            else:
                log_error(f"{self.name} oyun iptal edilemedi: {response.json()}")
                return False
        except Exception as e:
            log_error(f"{self.name} iptal hatası: {e}")
            return False
    
    def disconnect(self):
        if self.sio.connected:
            self.sio.disconnect()
            log_info(f"{self.name} WebSocket bağlantısı kesildi")

def test_complete_flow():
    log("\n" + "="*80, Colors.BOLD)
    log("🎮 MULTIPLAYER OYUN KAPSAMLI TEST BAŞLIYOR", Colors.BOLD + Colors.MAGENTA)
    log("="*80 + "\n", Colors.BOLD)
    
    user1 = TestUser(USER1['email'], USER1['password'], "USER1")
    user2 = TestUser(USER2['email'], USER2['password'], "USER2")
    
    # 1. Login
    log("\n" + "─"*80, Colors.CYAN)
    log("📝 ADIM 1: Kullanıcılar giriş yapıyor", Colors.BOLD)
    log("─"*80, Colors.CYAN)
    if not user1.login() or not user2.login():
        log_error("Login başarısız, test sonlandırılıyor")
        return
    
    # 2. WebSocket Bağlantısı
    log("\n" + "─"*80, Colors.CYAN)
    log("🔌 ADIM 2: WebSocket bağlantıları kuruluyor", Colors.BOLD)
    log("─"*80, Colors.CYAN)
    if not user1.connect_websocket():
        log_error("User1 WebSocket bağlanamadı")
        return
    if not user2.connect_websocket():
        log_error("User2 WebSocket bağlanamadı")
        return
    
    time.sleep(2)
    
    # 3. Oyun Daveti
    log("\n" + "─"*80, Colors.CYAN)
    log("📨 ADIM 3: Oyun daveti gönderiliyor", Colors.BOLD)
    log("─"*80, Colors.CYAN)
    invite_id = user1.send_game_invite(user2.username)
    if not invite_id:
        log_error("Davet gönderilemedi")
        return
    
    time.sleep(2)
    
    # 4. Davet Kontrolü
    log("\n" + "─"*80, Colors.CYAN)
    log("📬 ADIM 4: User2 davetleri kontrol ediyor", Colors.BOLD)
    log("─"*80, Colors.CYAN)
    invites = user2.get_pending_invites()
    if not invites:
        log_error("User2'de bekleyen davet yok!")
        return
    
    # 5. Davet Kabul
    log("\n" + "─"*80, Colors.CYAN)
    log("✅ ADIM 5: User2 daveti kabul ediyor", Colors.BOLD)
    log("─"*80, Colors.CYAN)
    game_id = user2.accept_invite(invite_id)
    if not game_id:
        log_error("Davet kabul edilemedi")
        return
    
    time.sleep(3)  # WebSocket event'lerinin gelmesi için bekle
    
    # WebSocket kontrolü
    log("\n" + "─"*80, Colors.CYAN)
    log("🔍 ADIM 6: WebSocket Event'leri kontrol ediliyor", Colors.BOLD)
    log("─"*80, Colors.CYAN)
    
    user1_got_notification = any(e[0] == 'invite_accepted' for e in user1.websocket_events)
    if user1_got_notification:
        log_success("✅ User1 'invite_accepted' event'ini aldı!")
    else:
        log_error("❌ User1 'invite_accepted' event'ini ALAMADI!")
        log_warning(f"User1 events: {user1.websocket_events}")
    
    # 6. Game Room'a Katılma
    log("\n" + "─"*80, Colors.CYAN)
    log("🚪 ADIM 7: Oyuncular game room'a katılıyor", Colors.BOLD)
    log("─"*80, Colors.CYAN)
    user1.join_game_room(game_id)
    user2.join_game_room(game_id)
    time.sleep(1)
    
    # 7. Ready Olma
    log("\n" + "─"*80, Colors.CYAN)
    log("⏳ ADIM 8: Oyuncular hazır oluyor", Colors.BOLD)
    log("─"*80, Colors.CYAN)
    user1.set_ready(game_id)
    time.sleep(1)
    user2.set_ready(game_id)
    time.sleep(3)  # game_started event için bekle
    
    # 8. Oyun Durumu Kontrolü
    log("\n" + "─"*80, Colors.CYAN)
    log("📊 ADIM 9: Oyun durumu kontrol ediliyor", Colors.BOLD)
    log("─"*80, Colors.CYAN)
    game1 = user1.get_game(game_id)
    game2 = user2.get_game(game_id)
    
    if game1 and game2:
        log_success(f"User1 Puanı: {game1.get('my_score', 0)}")
        log_success(f"User2 Puanı: {game2.get('my_score', 0)}")
        log_info(f"Oyun Durumu: {game1.get('status')}")
        log_info(f"Soru Sayısı: {len(game1.get('questions', []))}")
    
    # 9. İlk Soruya Cevap Verme
    if game1 and game1.get('status') == 'in_progress':
        log("\n" + "─"*80, Colors.CYAN)
        log("💬 ADIM 10: Oyuncular ilk soruya cevap veriyor", Colors.BOLD)
        log("─"*80, Colors.CYAN)
        
        # User1 cevap verir
        if game1.get('questions'):
            first_question = game1['questions'][0]
            log_info(f"Soru: {first_question.get('word')}")
            log_info(f"Seçenekler: {first_question.get('options')}")
            # İlk seçeneği gönder
            answer = first_question['options'][0]
            user1.submit_answer(game_id, 0, answer)
            time.sleep(2)
            
            # User2 cevap verir
            answer2 = first_question['options'][1]
            user2.submit_answer(game_id, 0, answer2)
            time.sleep(2)
            
            # Puanları kontrol et
            log("\n" + "─"*80, Colors.CYAN)
            log("🎯 ADIM 11: Güncel puanlar kontrol ediliyor", Colors.BOLD)
            log("─"*80, Colors.CYAN)
            game1_updated = user1.get_game(game_id)
            game2_updated = user2.get_game(game_id)
            
            if game1_updated and game2_updated:
                score1 = game1_updated.get('my_score', 0)
                score2 = game2_updated.get('my_score', 0)
                log_info(f"User1 Güncel Puan: {score1}")
                log_info(f"User2 Güncel Puan: {score2}")
                
                if score1 > 0 or score2 > 0:
                    log_success("✅ PUANLAMA SİSTEMİ ÇALIŞIYOR!")
                else:
                    log_error("❌ PUANLAR SIFIR KALIYOR!")
    
    # 10. İptal Testi
    log("\n" + "─"*80, Colors.CYAN)
    log("🚫 ADIM 12: İptal testi yapılıyor", Colors.BOLD)
    log("─"*80, Colors.CYAN)
    
    # User2'nin event'lerini temizle
    user2.websocket_events.clear()
    
    # User1 oyunu iptal eder
    user1.cancel_game(game_id)
    time.sleep(3)  # game_cancelled event için bekle
    
    # User2'ye bildirim geldi mi?
    user2_got_cancel = any(e[0] == 'game_cancelled' for e in user2.websocket_events)
    if user2_got_cancel:
        log_success("✅ User2 'game_cancelled' event'ini aldı!")
    else:
        log_error("❌ User2 'game_cancelled' event'ini ALAMADI!")
        log_warning(f"User2 events: {user2.websocket_events}")
    
    # Final Rapor
    log("\n" + "="*80, Colors.BOLD)
    log("📊 TEST SONUÇ RAPORU", Colors.BOLD + Colors.MAGENTA)
    log("="*80, Colors.BOLD)
    
    log(f"\n{Colors.CYAN}WebSocket Event'leri:{Colors.RESET}")
    log(f"  User1: {len(user1.websocket_events)} event")
    log(f"  User2: {len(user2.websocket_events)} event")
    
    log(f"\n{Colors.CYAN}Kritik Kontroller:{Colors.RESET}")
    check_mark = "✅" if user1_got_notification else "❌"
    log(f"  {check_mark} Davet kabul bildirimi")
    
    check_mark = "✅" if user2_got_cancel else "❌"
    log(f"  {check_mark} İptal senkronizasyonu")
    
    # Cleanup
    user1.disconnect()
    user2.disconnect()
    
    log("\n" + "="*80 + "\n", Colors.BOLD)

if __name__ == "__main__":
    try:
        test_complete_flow()
    except KeyboardInterrupt:
        log("\n\nTest kullanıcı tarafından durduruldu", Colors.YELLOW)
    except Exception as e:
        log_error(f"Test hatası: {e}")
        import traceback
        traceback.print_exc()
