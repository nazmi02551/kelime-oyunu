#!/usr/bin/env python3
"""Basit score testi - unique kullanıcılarla"""
import requests
import time
import random

BASE_URL = "http://localhost:5000"

class Player:
    def __init__(self, username, password, email):
        self.username = username
        self.password = password
        self.email = email
        self.session = requests.Session()
    
    def register(self):
        resp = self.session.post(f"{BASE_URL}/api/auth/register", json={
            "username": self.username,
            "password": self.password,
            "email": self.email
        })
        if resp.status_code == 201:
            data = resp.json()
            self.session.headers.update({'Authorization': f'Bearer {data["token"]}'})
            print(f"✓ {self.username} kayıt oldu")
            return True
        print(f"✗ {self.username} kayıt hatası: {resp.text}")
        return False

# Unique kullanıcılar
ts = str(int(time.time()))[-6:]
p1 = Player(f'sp1_{ts}', 'Test123!', f'sp1_{ts}@test.com')
p2 = Player(f'sp2_{ts}', 'Test123!', f'sp2_{ts}@test.com')

if not p1.register() or not p2.register():
    exit(1)

# Arkadaş ol
p1.session.post(f"{BASE_URL}/api/friends/send", json={"to_username": p2.username})
time.sleep(0.5)
requests_resp = p2.session.get(f"{BASE_URL}/api/friends/requests")
if requests_resp.status_code == 200 and requests_resp.json().get('pending'):
    fid = requests_resp.json()['pending'][0]['request_id']
    p2.session.post(f"{BASE_URL}/api/friends/respond", json={"friendship_id": fid, "accept": True})
print("✓ Arkadaş oldular")
time.sleep(0.5)

# Oyun daveti
p1.session.post(f"{BASE_URL}/api/game-invites/send", json={
    "to_username": p2.username,
    "game_settings": {"question_count": 5}
})
time.sleep(0.5)

# P2 kabul
invites = p2.session.get(f"{BASE_URL}/api/game-invites/pending").json()
if not invites.get('invites'):
    print("✗ Davet bulunamadı")
    exit(1)
    
invite_id = invites['invites'][0]['invite_id']
resp = p2.session.post(f"{BASE_URL}/api/game-invites/respond/{invite_id}", json={"accept": True})
game_id = resp.json().get('game_id')
print(f"✓ Oyun oluşturuldu: {game_id}")

# Ready
p1.session.post(f"{BASE_URL}/api/multiplayer/ready/{game_id}")
p2.session.post(f"{BASE_URL}/api/multiplayer/ready/{game_id}")
time.sleep(1)

# Oyunu al
game = p1.session.get(f"{BASE_URL}/api/multiplayer/game/{game_id}").json()
questions = game.get('game', {}).get('questions', [])
print(f"Soru sayısı: {len(questions)}")

# Her soru için
for i, q in enumerate(questions):
    first_option = q.get('options', ['test'])[0] if q.get('options') else 'test'
    
    # P1 cevap
    r1 = p1.session.post(f"{BASE_URL}/api/multiplayer/answer/{game_id}", json={
        "question_index": i, 
        "answer": first_option, 
        "time_taken": 3
    })
    status1 = "OK" if r1.status_code == 200 else r1.json().get('error', 'ERROR')
    print(f"  P1 soru {i}: {r1.status_code} - {status1}")
    
    # P2 cevap
    r2 = p2.session.post(f"{BASE_URL}/api/multiplayer/answer/{game_id}", json={
        "question_index": i, 
        "answer": "yanlis_cevap_xyz", 
        "time_taken": 5
    })
    status2 = "OK" if r2.status_code == 200 else r2.json().get('error', 'ERROR')
    print(f"  P2 soru {i}: {r2.status_code} - {status2}")
    time.sleep(0.2)

# Sonuc
time.sleep(1)
game = p1.session.get(f"{BASE_URL}/api/multiplayer/game/{game_id}").json()
print(f"\nStatus: {game.get('game', {}).get('status')}")
print(f"P1 Score: {game.get('game', {}).get('my_score')}")
print(f"P2 Score: {game.get('game', {}).get('opponent_score')}")
print(f"Winner: {game.get('game', {}).get('winner')}")
