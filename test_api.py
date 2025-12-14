#!/usr/bin/env python3
"""Backend API Test Script"""

import requests

BASE_URL = "http://localhost:5000"

# Test kullanıcıları
USER1 = {"email": "deneme1@deneme1.com", "password": "deneme1123"}
USER2 = {"email": "deneme2@deneme2.com", "password": "deneme2123"}

def login(user):
    """Kullanıcı girişi yapar ve token döner"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json=user)
    print(f"\n🔐 Login ({user['email']}): {resp.status_code}")
    data = resp.json()
    if resp.status_code == 200 and data.get('token'):
        user_data = data.get('user', {})
        user_id = user_data.get('id') or user_data.get('_id')
        print(f"   ✅ Token alındı, User ID: {user_id}")
        print(f"   Username: {user_data.get('username')}")
        return data.get('token'), user_data
    else:
        print(f"   ❌ Hata: {data}")
        return None, None

def get_friends(token):
    """Arkadaş listesini getirir"""
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BASE_URL}/api/friends/list", headers=headers)
    print(f"\n👥 Arkadaş Listesi: {resp.status_code}")
    data = resp.json()
    if data.get('success'):
        friends = data.get('friends', [])
        print(f"   ✅ {len(friends)} arkadaş bulundu")
        for f in friends:
            print(f"      - {f.get('username')} (ID: {f.get('user_id')})")
        return friends
    else:
        print(f"   ❌ Hata: {data}")
        return []

def send_game_invite(token, to_username):
    """Oyun daveti gönderir"""
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"to_username": to_username, "game_settings": {"question_count": 10}}
    resp = requests.post(f"{BASE_URL}/api/game-invites/send", headers=headers, json=payload)
    print(f"\n🎮 Oyun Daveti Gönder ({to_username}): {resp.status_code}")
    data = resp.json()
    print(f"   Response: {data}")
    return data

def get_pending_invites(token):
    """Bekleyen davetleri getirir"""
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BASE_URL}/api/game-invites/pending", headers=headers)
    print(f"\n📬 Bekleyen Davetler: {resp.status_code}")
    data = resp.json()
    if data.get('success'):
        invites = data.get('invites', [])
        print(f"   ✅ {len(invites)} davet bulundu")
        for inv in invites:
            print(f"      - {inv.get('from_username')} -> invite_id: {inv.get('invite_id')}")
        return invites
    else:
        print(f"   ❌ Hata: {data}")
        return []

def respond_to_invite(token, invite_id, accept=True):
    """Davete yanıt verir"""
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"accept": accept}
    resp = requests.post(f"{BASE_URL}/api/game-invites/respond/{invite_id}", headers=headers, json=payload)
    print(f"\n✅ Davete Yanıt ({invite_id}, accept={accept}): {resp.status_code}")
    data = resp.json()
    print(f"   Response: {data}")
    return data

def get_conversations(token):
    """Konuşmaları getirir"""
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BASE_URL}/api/messages/conversations", headers=headers)
    print(f"\n💬 Konuşmalar: {resp.status_code}")
    data = resp.json()
    if data.get('success'):
        convs = data.get('conversations', [])
        print(f"   ✅ {len(convs)} konuşma bulundu")
        for c in convs:
            print(f"      - {c.get('friend_username')}: {c.get('last_message', '')[:30]}")
        return convs
    else:
        print(f"   ❌ Hata: {data}")
        return []

def send_message(token, to_username, content):
    """Mesaj gönderir"""
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"to_username": to_username, "content": content}
    resp = requests.post(f"{BASE_URL}/api/messages/send", headers=headers, json=payload)
    print(f"\n📤 Mesaj Gönder ({to_username}): {resp.status_code}")
    data = resp.json()
    print(f"   Response: {data}")
    return data

def get_messages(token, conversation_id):
    """Mesajları getirir"""
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BASE_URL}/api/messages/conversation/{conversation_id}", headers=headers)
    print(f"\n📥 Mesajlar ({conversation_id}): {resp.status_code}")
    data = resp.json()
    if data.get('success'):
        msgs = data.get('messages', [])
        print(f"   ✅ {len(msgs)} mesaj bulundu")
        for m in msgs[-5:]:  # Son 5 mesaj
            print(f"      - [{m.get('_id')}] is_mine={m.get('is_mine')}: {m.get('content', '')[:30]}")
        return msgs
    else:
        print(f"   ❌ Hata: {data}")
        return []

def delete_message(token, message_id):
    """Mesaj siler"""
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.delete(f"{BASE_URL}/api/messages/delete/{message_id}", headers=headers)
    print(f"\n🗑️ Mesaj Sil ({message_id}): {resp.status_code}")
    data = resp.json()
    print(f"   Response: {data}")
    return data

def remove_friend(token, friend_username):
    """Arkadaş siler"""
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"friend_username": friend_username}
    resp = requests.post(f"{BASE_URL}/api/friends/remove", headers=headers, json=payload)
    print(f"\n❌ Arkadaş Sil ({friend_username}): {resp.status_code}")
    data = resp.json()
    print(f"   Response: {data}")
    return data

def check_friendships_db():
    """MongoDB'deki arkadaşlık kayıtlarını kontrol et"""
    print("\n" + "="*60)
    print("📊 MongoDB Arkadaşlık Kayıtları Kontrolü")
    print("="*60)
    
    # Bu kısım için backend'e özel endpoint ekleyeceğiz
    resp = requests.get(f"{BASE_URL}/api/friends/debug-friendships")
    print(f"   Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"   Response: {data}")

def main():
    print("="*60)
    print("🧪 BACKEND API TEST")
    print("="*60)
    
    # 1. Her iki kullanıcıyla login
    token1, user1 = login(USER1)
    token2, user2 = login(USER2)
    
    if not token1 or not token2:
        print("\n❌ Login başarısız, test durduruluyor")
        return
    
    # 2. Arkadaş listelerini kontrol et
    print("\n" + "="*60)
    print("📋 USER1 Arkadaş Listesi")
    friends1 = get_friends(token1)
    
    print("\n" + "="*60)
    print("📋 USER2 Arkadaş Listesi")
    friends2 = get_friends(token2)
    
    # 3. Oyun daveti testi
    print("\n" + "="*60)
    print("🎮 OYUN DAVETİ TESTİ")
    print("="*60)
    
    if user2:
        # User1'den User2'ye davet gönder
        result = send_game_invite(token1, user2.get('username'))
        
        # User2'nin bekleyen davetlerini kontrol et
        invites = get_pending_invites(token2)
        
        # İlk daveti kabul et
        if invites:
            invite_id = invites[0].get('invite_id')
            respond_result = respond_to_invite(token2, invite_id, accept=True)
    
    # 4. Mesajlaşma testi
    print("\n" + "="*60)
    print("💬 MESAJLAŞMA TESTİ")
    print("="*60)
    
    # Mesaj gönder
    if user2:
        send_result = send_message(token1, user2.get('username'), f"Test mesajı - API test")
        
        # Konuşmaları getir
        convs = get_conversations(token1)
        
        if convs:
            conv_id = convs[0].get('conversation_id')
            messages = get_messages(token1, conv_id)
            
            # Kendi mesajımızı silmeyi dene
            my_messages = [m for m in messages if m.get('is_mine')]
            if my_messages:
                msg_to_delete = my_messages[-1]
                delete_result = delete_message(token1, msg_to_delete.get('_id'))
    
    print("\n" + "="*60)
    print("✅ TEST TAMAMLANDI")
    print("="*60)

if __name__ == "__main__":
    main()
