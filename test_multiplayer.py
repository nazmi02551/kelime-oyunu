#!/usr/bin/env python3
"""
Multiplayer Oyun Simülasyonu ve Test Script'i
Bu script iki oyuncuyu simüle ederek multiplayer oyun akışını test eder
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:5000"

class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def log(message, color=Colors.OKBLUE):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"{color}[{timestamp}] {message}{Colors.ENDC}")

def log_success(message):
    log(f"✓ {message}", Colors.OKGREEN)

def log_error(message):
    log(f"✗ {message}", Colors.FAIL)

def log_info(message):
    log(f"ℹ {message}", Colors.OKCYAN)

def log_warning(message):
    log(f"⚠ {message}", Colors.WARNING)

class Player:
    def __init__(self, username, password):
        self.username = username
        self.password = password
        self.token = None
        self.user_id = None
        self.session = requests.Session()

    def register(self):
        """Oyuncu kaydı"""
        try:
            response = self.session.post(
                f"{BASE_URL}/api/auth/register",
                json={
                    "username": self.username,
                    "password": self.password,
                    "email": f"{self.username}@test.com"
                }
            )
            if response.status_code == 201:
                data = response.json()
                self.token = data.get('token')
                self.user_id = data.get('user', {}).get('_id')
                if self.token:
                    self.session.headers.update({'Authorization': f'Bearer {self.token}'})
                    log_success(f"{self.username} kaydı oluşturuldu")
                    return True
            elif "zaten kayıtlı" in response.text.lower():
                log_info(f"{self.username} zaten kayıtlı, login yapılıyor...")
                return self.login()
            else:
                log_error(f"{self.username} kaydı başarısız: {response.text}")
                return self.login()  # Varolan kullanıcı için login dene
        except Exception as e:
            log_error(f"{self.username} kayıt hatası: {e}")
            return self.login()  # Hata durumunda login dene

    def login(self):
        """Oyuncu girişi"""
        try:
            response = self.session.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": f"{self.username}@test.com", "password": self.password}
            )
            if response.status_code == 200:
                data = response.json()
                self.token = data['token']
                self.user_id = data['user']['id']
                self.session.headers.update({'Authorization': f'Bearer {self.token}'})
                log_success(f"{self.username} giriş yaptı")
                return True
            else:
                log_error(f"{self.username} giriş başarısız: {response.text}")
                return False
        except Exception as e:
            log_error(f"{self.username} login hatası: {e}")
            return False

    def send_friend_request(self, to_username):
        """Arkadaşlık isteği gönder"""
        try:
            response = self.session.post(
                f"{BASE_URL}/api/friends/send",
                json={"to_username": to_username}
            )
            if response.status_code == 200:
                log_success(f"{self.username} → {to_username} arkadaşlık isteği gönderildi")
                return True
            else:
                log_warning(f"{self.username} arkadaşlık isteği hatası: {response.text}")
                return False
        except Exception as e:
            log_error(f"Arkadaşlık isteği hatası: {e}")
            return False

    def accept_friend_request(self):
        """Bekleyen arkadaşlık isteklerini kabul et"""
        try:
            response = self.session.get(f"{BASE_URL}/api/friends/requests")
            if response.status_code == 200:
                data = response.json()
                pending = data.get('pending', [])
                for request in pending:
                    friendship_id = request.get('request_id')
                    from_user = request.get('from_username')
                    resp = self.session.post(
                        f"{BASE_URL}/api/friends/respond",
                        json={"friendship_id": friendship_id, "accept": True}
                    )
                    if resp.status_code == 200:
                        log_success(f"{self.username} ← {from_user} arkadaşlık kabul edildi")
                return True
        except Exception as e:
            log_error(f"Arkadaşlık kabul hatası: {e}")
            return False

    def send_game_invite(self, to_username, question_count=5):
        """Oyun daveti gönder"""
        try:
            response = self.session.post(
                f"{BASE_URL}/api/game-invites/send",
                json={
                    "to_username": to_username,
                    "game_settings": {"question_count": question_count}
                }
            )
            if response.status_code == 200:
                log_success(f"{self.username} → {to_username} oyun daveti gönderildi ({question_count} soru)")
                return response.json().get('invite_id')
            else:
                log_error(f"Oyun daveti hatası: {response.text}")
                return None
        except Exception as e:
            log_error(f"Oyun daveti hatası: {e}")
            return None

    def accept_game_invite(self):
        """Bekleyen oyun davetlerini kabul et"""
        try:
            response = self.session.get(f"{BASE_URL}/api/game-invites/pending")
            if response.status_code == 200:
                data = response.json()
                invites = data.get('invites', [])
                if invites:
                    invite = invites[0]
                    invite_id = invite.get('invite_id')
                    from_user = invite.get('from_username')
                    
                    resp = self.session.post(
                        f"{BASE_URL}/api/game-invites/respond/{invite_id}",
                        json={"accept": True}
                    )
                    if resp.status_code == 200:
                        game_id = resp.json().get('game_id')
                        log_success(f"{self.username} ← {from_user} oyun daveti kabul edildi (game_id: {game_id})")
                        return game_id
            return None
        except Exception as e:
            log_error(f"Oyun daveti kabul hatası: {e}")
            return None

    def set_ready(self, game_id):
        """Oyunda hazır olarak işaretle"""
        try:
            response = self.session.post(f"{BASE_URL}/api/multiplayer/ready/{game_id}")
            if response.status_code == 200:
                data = response.json()
                log_success(f"{self.username} hazır oldu")
                return data.get('game_started', False)
            else:
                log_error(f"{self.username} hazır işareti hatası: {response.text}")
                return False
        except Exception as e:
            log_error(f"Hazır işareti hatası: {e}")
            return False

    def get_game(self, game_id):
        """Oyun durumunu getir"""
        try:
            response = self.session.get(f"{BASE_URL}/api/multiplayer/game/{game_id}")
            if response.status_code == 200:
                return response.json().get('game')
            return None
        except Exception as e:
            log_error(f"Oyun durumu alma hatası: {e}")
            return None

    def submit_answer(self, game_id, question_index, answer, time_taken=5):
        """Cevap gönder"""
        try:
            response = self.session.post(
                f"{BASE_URL}/api/multiplayer/answer/{game_id}",
                json={
                    "question_index": question_index,
                    "answer": answer,
                    "time_taken": time_taken
                }
            )
            if response.status_code == 200:
                data = response.json()
                correct = "✓" if data.get('is_correct') else "✗"
                log_info(f"{self.username} soru {question_index+1}: {correct} (puan: {data.get('score_earned', 0)})")
                return True
            else:
                log_error(f"{self.username} cevap gönderme hatası: {response.text}")
                return False
        except Exception as e:
            log_error(f"Cevap gönderme hatası: {e}")
            return False


def test_multiplayer_game():
    """Multiplayer oyun akışını test et"""
    
    log(f"\n{'='*60}", Colors.HEADER)
    log("MULTIPLAYER OYUN SİMÜLASYONU BAŞLIYOR", Colors.HEADER)
    log(f"{'='*60}\n", Colors.HEADER)
    
    # Oyuncular oluştur
    player1 = Player("testuser1", "Test123!")
    player2 = Player("testuser2", "Test123!")
    
    # 1. Kayıt/Giriş
    log("\n[1/7] Oyuncu Kayıt/Giriş", Colors.BOLD)
    if not player1.register() or not player2.register():
        log_error("Oyuncu kaydı başarısız!")
        return False
    
    time.sleep(1)
    
    # 2. Arkadaşlık
    log("\n[2/7] Arkadaşlık İsteği", Colors.BOLD)
    player1.send_friend_request(player2.username)
    time.sleep(1)
    player2.accept_friend_request()
    time.sleep(1)
    
    # 3. Oyun Daveti
    log("\n[3/7] Oyun Daveti", Colors.BOLD)
    invite_id = player1.send_game_invite(player2.username, question_count=5)
    if not invite_id:
        log_error("Oyun daveti gönderilemedi!")
        return False
    
    time.sleep(1)
    
    # 4. Davet Kabul
    log("\n[4/7] Davet Kabul", Colors.BOLD)
    game_id = player2.accept_game_invite()
    if not game_id:
        log_error("Oyun daveti kabul edilemedi!")
        return False
    
    time.sleep(1)
    
    # 5. Hazır Olma
    log("\n[5/7] Oyuncular Hazır Oluyor", Colors.BOLD)
    player1.set_ready(game_id)
    time.sleep(0.5)
    game_started = player2.set_ready(game_id)
    
    if game_started:
        log_success("Oyun başladı!")
    else:
        log_warning("Oyun henüz başlamadı")
    
    time.sleep(2)
    
    # 6. Oyun Oynama
    log("\n[6/7] Oyun Oynama", Colors.BOLD)
    game = player1.get_game(game_id)
    
    if not game or game['status'] != 'in_progress':
        log_error(f"Oyun başlatılamadı! Status: {game.get('status') if game else 'None'}")
        return False
    
    questions = game.get('questions', [])
    total_questions = len(questions)
    log_info(f"Toplam {total_questions} soru")
    
    # Her soru için cevap gönder
    for i, question in enumerate(questions):
        log_info(f"\nSoru {i+1}/{total_questions}: {question.get('word')}")
        
        # Doğru cevabı bul (ilk şık doğru değilse)
        correct_answer = question.get('meaning')
        options = question.get('options', [])
        
        # Player1: Doğru cevap
        player1.submit_answer(game_id, i, correct_answer, time_taken=3)
        time.sleep(0.5)
        
        # Player2: İkinci şıkkı seç (random)
        player2_answer = options[1] if len(options) > 1 else options[0]
        player2.submit_answer(game_id, i, player2_answer, time_taken=5)
        
        time.sleep(1)
    
    # 7. Sonuç
    log("\n[7/7] Oyun Sonucu", Colors.BOLD)
    time.sleep(2)
    final_game = player1.get_game(game_id)
    
    if final_game:
        log_info(f"Oyun Durumu: {final_game.get('status')}")
        log_info(f"{player1.username} Puan: {final_game.get('player1_score', 0)}")
        log_info(f"{player2.username} Puan: {final_game.get('player2_score', 0)}")
        log_info(f"Kazanan: {final_game.get('winner', 'Belirsiz')}")
    
    log(f"\n{'='*60}", Colors.HEADER)
    log("TEST TAMAMLANDI", Colors.OKGREEN)
    log(f"{'='*60}\n", Colors.HEADER)
    
    return True


if __name__ == "__main__":
    try:
        test_multiplayer_game()
    except KeyboardInterrupt:
        log("\n\nTest kullanıcı tarafından iptal edildi", Colors.WARNING)
    except Exception as e:
        log_error(f"Test hatası: {e}")
        import traceback
        traceback.print_exc()
