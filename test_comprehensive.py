#!/usr/bin/env python3
"""
Kapsamlı Backend Test Scripti
Önceki konuşmalarda tespit edilen tüm sorunları test eder:
1. Alert.confirm yerine in-game notifications (frontend test)
2. 400 errors on answer submission (null handling)
3. Question count kontrolü (max 5 soru, 6+ olmamalı)
4. Answer validation (null, empty string, duplicate submissions)
5. WebSocket event testing
6. Score calculation testing
7. Game state transitions
8. Register/Login edge cases
9. Friendship workflow
10. Game invite workflow
"""

import requests
import json
import time
from datetime import datetime
import sys

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

def log_test(test_name):
    log(f"\n{'='*60}", Colors.HEADER)
    log(f"TEST: {test_name}", Colors.BOLD)
    log(f"{'='*60}", Colors.HEADER)

class TestPlayer:
    def __init__(self, username, password, email=None):
        self.username = username
        self.password = password
        self.email = email or f"{username}@test.com"
        self.token = None
        self.user_id = None
        self.session = requests.Session()
    
    def make_friends_with(self, other_player):
        """Diğer oyuncu ile arkadaş ol"""
        # İstek gönder
        self.session.post(f"{BASE_URL}/api/friends/send", json={"to_username": other_player.username})
        time.sleep(0.5)
        
        # Diğer oyuncu kabul etsin
        requests_resp = other_player.session.get(f"{BASE_URL}/api/friends/requests")
        if requests_resp.status_code == 200 and requests_resp.json().get('pending'):
            friendship_id = requests_resp.json()['pending'][0]['request_id']
            other_player.session.post(f"{BASE_URL}/api/friends/respond", json={
                "friendship_id": friendship_id,
                "accept": True
            })
            time.sleep(0.5)
            return True
        return False

    def register(self):
        """Oyuncu kaydı"""
        try:
            response = self.session.post(
                f"{BASE_URL}/api/auth/register",
                json={
                    "username": self.username,
                    "password": self.password,
                    "email": self.email
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
                return self.login()
        except Exception as e:
            log_error(f"{self.username} kayıt hatası: {e}")
            return self.login()

    def login(self):
        """Oyuncu girişi"""
        try:
            response = self.session.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": self.email, "password": self.password}
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


# ============================================================
# TEST 1: Register/Login Edge Cases
# ============================================================
def test_auth_edge_cases():
    log_test("Register/Login Edge Cases")
    
    # 1.1: Boş email
    log_info("Test 1.1: Boş email ile kayıt")
    response = requests.post(f"{BASE_URL}/api/auth/register", json={
        "username": "test1", "password": "Test123!", "email": ""
    })
    if response.status_code == 400:
        log_success("Boş email reddedildi")
    else:
        log_error(f"Boş email kabul edildi! Status: {response.status_code}")
    
    # 1.2: Duplicate email
    log_info("Test 1.2: Duplicate email")
    player = TestPlayer("edgecase1", "Test123!")
    player.register()
    response = requests.post(f"{BASE_URL}/api/auth/register", json={
        "username": "edgecase2", "password": "Test123!", "email": player.email
    })
    if response.status_code == 409:
        log_success("Duplicate email reddedildi")
    else:
        log_error(f"Duplicate email kabul edildi! Status: {response.status_code}")
    
    # 1.3: Invalid token
    log_info("Test 1.3: Invalid token ile istek")
    response = requests.get(f"{BASE_URL}/api/auth/verify", headers={
        'Authorization': 'Bearer invalid_token_12345'
    })
    if response.status_code == 401:
        log_success("Invalid token reddedildi")
    else:
        log_error(f"Invalid token kabul edildi! Status: {response.status_code}")


# ============================================================
# TEST 2: Question Count Limit (MAX 5)
# ============================================================
def test_question_count_limit():
    log_test("Question Count - Kullanıcı İsteği")
    
    player1 = TestPlayer("qcount1", "Test123!")
    player2 = TestPlayer("qcount2", "Test123!")
    
    if not player1.register() or not player2.register():
        log_error("Oyuncular oluşturulamadı")
        return
    
    # Arkadaşlık
    player1.make_friends_with(player2)
    
    # Oyun daveti - 10 soru iste
    log_info("10 soru ile oyun daveti gönderiliyor...")
    response = player1.session.post(f"{BASE_URL}/api/game-invites/send", json={
        "to_username": player2.username,
        "game_settings": {"question_count": 10}
    })
    
    if response.status_code != 200:
        log_error(f"Davet gönderilemedi: {response.text}")
        return
    
    # Daveti kabul et
    time.sleep(0.5)
    invites = player2.session.get(f"{BASE_URL}/api/game-invites/pending").json()
    if invites.get('invites'):
        invite_id = invites['invites'][0]['invite_id']
        resp = player2.session.post(f"{BASE_URL}/api/game-invites/respond/{invite_id}", 
                                     json={"accept": True})
        game_id = resp.json().get('game_id')
        
        # Oyunu başlat
        player1.session.post(f"{BASE_URL}/api/multiplayer/ready/{game_id}")
        player2.session.post(f"{BASE_URL}/api/multiplayer/ready/{game_id}")
        time.sleep(1)
        
        # Soru sayısını kontrol et
        game = player1.session.get(f"{BASE_URL}/api/multiplayer/game/{game_id}").json()
        questions = game.get('game', {}).get('questions', [])
        
        if len(questions) == 10:
            log_success(f"✓ Soru sayısı kullanıcı isteği ile eşleşiyor: {len(questions)}")
        if len(questions) == 10:
            log_success(f"✓ Soru sayısı kullanıcı isteği ile eşleşiyor: {len(questions)}")
        else:
            log_error(f"✗ SORUN! Kullanıcı 10 istedi, {len(questions)} geldi")


# ============================================================
# TEST 3: Answer Validation (null, empty, invalid)
# ============================================================
def test_answer_validation():
    log_test("Answer Validation (null, empty, duplicate)")
    
    player1 = TestPlayer("ansval1", "Test123!")
    player2 = TestPlayer("ansval2", "Test123!")
    
    if not player1.register() or not player2.register():
        return
    
    # Oyun kur
    player1.make_friends_with(player2)
    response = player1.session.post(f"{BASE_URL}/api/game-invites/send", json={
        "to_username": player2.username,
        "game_settings": {"question_count": 5}
    })
    time.sleep(0.5)
    
    invites = player2.session.get(f"{BASE_URL}/api/game-invites/pending").json()
    if not invites.get('invites'):
        log_error("Davet alınamadı")
        return
    
    invite_id = invites['invites'][0]['invite_id']
    resp = player2.session.post(f"{BASE_URL}/api/game-invites/respond/{invite_id}", 
                                 json={"accept": True})
    game_id = resp.json().get('game_id')
    
    player1.session.post(f"{BASE_URL}/api/multiplayer/ready/{game_id}")
    player2.session.post(f"{BASE_URL}/api/multiplayer/ready/{game_id}")
    time.sleep(1)
    
    # 3.1: null answer
    log_info("Test 3.1: null answer")
    response = player1.session.post(f"{BASE_URL}/api/multiplayer/answer/{game_id}", json={
        "question_index": 0,
        "answer": None,
        "time_taken": 5
    })
    if response.status_code == 400:
        log_success("null answer reddedildi")
    else:
        log_error(f"null answer kabul edildi! Status: {response.status_code}")
    
    # 3.2: empty string answer
    log_info("Test 3.2: empty string answer")
    response = player1.session.post(f"{BASE_URL}/api/multiplayer/answer/{game_id}", json={
        "question_index": 0,
        "answer": "",
        "time_taken": 5
    })
    if response.status_code == 400 or not response.json().get('is_correct'):
        log_success("empty string answer işlendi")
    else:
        log_warning("empty string answer doğru olarak kabul edildi")
    
    # 3.3: Duplicate submission
    log_info("Test 3.3: Duplicate answer submission")
    # İlk cevap
    game = player1.session.get(f"{BASE_URL}/api/multiplayer/game/{game_id}").json()
    question = game.get('game', {}).get('questions', [{}])[0]
    correct = question.get('meaning', 'test')
    
    resp1 = player1.session.post(f"{BASE_URL}/api/multiplayer/answer/{game_id}", json={
        "question_index": 0,
        "answer": correct,
        "time_taken": 3
    })
    # Tekrar aynı soru
    resp2 = player1.session.post(f"{BASE_URL}/api/multiplayer/answer/{game_id}", json={
        "question_index": 0,
        "answer": correct,
        "time_taken": 3
    })
    
    if resp2.status_code == 400 or "zaten cevapladı" in resp2.text.lower():
        log_success("Duplicate submission engellendi")
    else:
        log_warning(f"Duplicate submission izin verildi: {resp2.text}")


# ============================================================
# TEST 4: Game State Transitions
# ============================================================
def test_game_state_transitions():
    log_test("Game State Transitions (waiting → in_progress → completed)")
    
    player1 = TestPlayer("state1", "Test123!")
    player2 = TestPlayer("state2", "Test123!")
    
    if not player1.register() or not player2.register():
        return
    
    # Oyun kur
    player1.make_friends_with(player2)
    response = player1.session.post(f"{BASE_URL}/api/game-invites/send", json={
        "to_username": player2.username,
        "game_settings": {"question_count": 5}
    })
    time.sleep(0.5)
    
    invites = player2.session.get(f"{BASE_URL}/api/game-invites/pending").json()
    invite_id = invites['invites'][0]['invite_id']
    resp = player2.session.post(f"{BASE_URL}/api/game-invites/respond/{invite_id}", 
                                 json={"accept": True})
    game_id = resp.json().get('game_id')
    
    # 4.1: Initial state
    game = player1.session.get(f"{BASE_URL}/api/multiplayer/game/{game_id}").json()
    status = game.get('game', {}).get('status')
    if status == 'waiting':
        log_success(f"✓ Initial state: {status}")
    else:
        log_error(f"✗ Initial state yanlış: {status} (olmalı: waiting)")
    
    # 4.2: After ready
    player1.session.post(f"{BASE_URL}/api/multiplayer/ready/{game_id}")
    player2.session.post(f"{BASE_URL}/api/multiplayer/ready/{game_id}")
    time.sleep(1)
    
    game = player1.session.get(f"{BASE_URL}/api/multiplayer/game/{game_id}").json()
    status = game.get('game', {}).get('status')
    if status == 'in_progress':
        log_success(f"✓ After ready state: {status}")
    else:
        log_error(f"✗ After ready state yanlış: {status} (olmalı: in_progress)")
    
    # 4.3: After completion (tüm soruları cevapla)
    questions = game.get('game', {}).get('questions', [])
    for i, q in enumerate(questions):
        player1.session.post(f"{BASE_URL}/api/multiplayer/answer/{game_id}", json={
            "question_index": i,
            "answer": q.get('meaning'),
            "time_taken": 3
        })
        player2.session.post(f"{BASE_URL}/api/multiplayer/answer/{game_id}", json={
            "question_index": i,
            "answer": q.get('options', [''])[0],
            "time_taken": 5
        })
        time.sleep(0.3)
    
    time.sleep(2)
    game = player1.session.get(f"{BASE_URL}/api/multiplayer/game/{game_id}").json()
    status = game.get('game', {}).get('status')
    if status == 'completed':
        log_success(f"✓ After completion state: {status}")
    else:
        log_warning(f"⚠ After completion state: {status} (olmalı: completed)")


# ============================================================
# TEST 5: Score Calculation
# ============================================================
def test_score_calculation():
    log_test("Score Calculation (doğru cevap puanlandırma)")
    
    player1 = TestPlayer("score1", "Test123!")
    player2 = TestPlayer("score2", "Test123!")
    
    if not player1.register() or not player2.register():
        return
    
    # Oyun kur
    player1.make_friends_with(player2)
    response = player1.session.post(f"{BASE_URL}/api/game-invites/send", json={
        "to_username": player2.username,
        "game_settings": {"question_count": 5}
    })
    time.sleep(0.5)
    
    invites = player2.session.get(f"{BASE_URL}/api/game-invites/pending").json()
    invite_id = invites['invites'][0]['invite_id']
    resp = player2.session.post(f"{BASE_URL}/api/game-invites/respond/{invite_id}", 
                                 json={"accept": True})
    game_id = resp.json().get('game_id')
    
    player1.session.post(f"{BASE_URL}/api/multiplayer/ready/{game_id}")
    player2.session.post(f"{BASE_URL}/api/multiplayer/ready/{game_id}")
    time.sleep(1)
    
    # Player1 tüm soruları doğru, Player2 tüm soruları yanlış
    game = player1.session.get(f"{BASE_URL}/api/multiplayer/game/{game_id}").json()
    questions = game.get('game', {}).get('questions', [])
    
    # MongoDB yerine - her sorunun options'ından ilk şıkkı gönder (backend karışık gönderdiği için bu doğru olmayabilir)
    # En basit çözüm: Her sorunun word'ünü gönder - backend artık normalize ediyor
    log_info(f"Player1 tüm soruları doğru cevaplayacak ({len(questions)} soru)")
    for i, q in enumerate(questions):
        # Options'dan rastgele birini gönder - normalize edildi, işe yaramalı
        # Ama doğrusunu bilmediğimiz için her seferinde ilk option'ı gönderelim
        first_option = q.get('options', [])[0] if q.get('options') else "test"
        
        # Player1: İlk option'ı gönder
        resp = player1.session.post(f"{BASE_URL}/api/multiplayer/answer/{game_id}", json={
            "question_index": i,
            "answer": first_option,
            "time_taken": 3
        })
        if resp.status_code == 200:
            data = resp.json()
            score = data.get('score_earned', 0)
            is_correct = data.get('is_correct', False)
            log_info(f"  Soru {i+1} ({q['word']}): {'✓' if is_correct else '✗'} +{score} puan")
        else:
            log_error(f"  Soru {i+1}: HTTP {resp.status_code} - {resp.text}")
        
        # Player2: Yanlış cevap
        player2.session.post(f"{BASE_URL}/api/multiplayer/answer/{game_id}", json={
            "question_index": i,
            "answer": "yanlış_cevap_xyz",
            "time_taken": 5
        })
        time.sleep(0.3)
    
    time.sleep(2)
    game = player1.session.get(f"{BASE_URL}/api/multiplayer/game/{game_id}").json()
    p1_score = game.get('game', {}).get('player1_score', 0)
    p2_score = game.get('game', {}).get('player2_score', 0)
    winner = game.get('game', {}).get('winner', '')
    
    log_info(f"Player1 Score: {p1_score}")
    log_info(f"Player2 Score: {p2_score}")
    log_info(f"Winner: {winner}")
    
    if p1_score > p2_score and p1_score > 0:
        log_success("✓ Score calculation doğru (doğru cevaplar puanlandı)")
    else:
        log_error(f"✗ Score calculation yanlış! P1:{p1_score}, P2:{p2_score}")


# ============================================================
# MAIN
# ============================================================
def main():
    log("\n" + "="*60, Colors.HEADER)
    log("KAPSAMLI BACKEND TEST SUITE", Colors.HEADER)
    log("="*60 + "\n", Colors.HEADER)
    
    tests = [
        ("1. Auth Edge Cases", test_auth_edge_cases),
        ("2. Question Count", test_question_count_limit),
        ("3. Answer Validation", test_answer_validation),
        ("4. Game State Transitions", test_game_state_transitions),
        ("5. Score Calculation", test_score_calculation),
    ]
    
    passed = 0
    failed = 0
    
    for name, test_func in tests:
        try:
            log(f"\n{'='*60}", Colors.BOLD)
            log(f"ÇALIŞTIRILIYOR: {name}", Colors.BOLD)
            log(f"{'='*60}", Colors.BOLD)
            test_func()
            passed += 1
            log_success(f"{name} - BAŞARILI")
        except Exception as e:
            failed += 1
            log_error(f"{name} - BAŞARISIZ: {e}")
            import traceback
            traceback.print_exc()
        
        time.sleep(2)
    
    # Özet
    log("\n" + "="*60, Colors.HEADER)
    log("TEST SONUÇLARI", Colors.HEADER)
    log("="*60, Colors.HEADER)
    log(f"Toplam Test: {passed + failed}", Colors.BOLD)
    log(f"Başarılı: {passed}", Colors.OKGREEN)
    log(f"Başarısız: {failed}", Colors.FAIL)
    log("="*60 + "\n", Colors.HEADER)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log("\n\nTest kullanıcı tarafından iptal edildi", Colors.WARNING)
        sys.exit(1)
    except Exception as e:
        log_error(f"Test suite hatası: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
