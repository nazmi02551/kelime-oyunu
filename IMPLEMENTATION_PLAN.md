# TOPLU DÜZELTME PLANI

## 1. FriendsScreen - Header ve Icon Düzeltmeleri
- ✅ Header gradient + shadow (Admin/Profile tarzı)
- ❌ Arkadaşlık/davet iconları güzel değil
- ❌ Responsive sorunlar

## 2. GameScreen - Bildirim Konumu ve Responsive
- ❌ GameNotification pozisyon
- ❌ Responsive layout

## 3. MultiplayerGameScreen - Aynı sorunlar
- ❌ Bildirim konumu
- ❌ Responsive layout

## 4. MessagesScreen - Aynı sorunlar
- ❌ Header design
- ❌ Responsive

## 5. Backend - Davet Kabul Hatası
- ❌ respond_to_invite başarısız oluyor
- ❌ "Zaten bekleyen davet var" yanlış uyarı

## DEĞİŞTİRİLECEKLER:
1. Tüm sayfalarda GradientView header ekle (Admin/Profile tarzı)
2. GameNotification component'ini tüm sayfalarda üst ortada göster  
3. ScrollView contentContainerStyle={{ flexGrow: 1, minHeight: '100%' }}
4. Icon tasarımlarını iyileştir (büyük, gradient arka plan)
5. Backend davet kontrolünü düzelt
