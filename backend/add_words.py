#!/usr/bin/env python3
"""
Türkçe Kelime Ekleme Scripti
Veritabanına çok sayıda Türkçe kelime ekler.
"""

import sys
sys.path.insert(0, 'd:/kelime-oyunu/backend')

from pymongo import MongoClient
from datetime import datetime
from config import Config

# MongoDB bağlantısı
client = MongoClient(Config.MONGO_URI)
# MONGO_URI'den veritabanı adını al
db_name = Config.MONGO_URI.split('/')[-1].split('?')[0] if '/' in Config.MONGO_URI else 'kelimeOyunu'
db = client[db_name]
words_collection = db.words

# Türkçe kelimeler - kategori ve zorluk seviyelerine göre
KELIMELER = [
    # HAYVANLAR - Kolay (4-5 harf)
    {"kelime": "kedi", "aciklama": "Miyavlayan evcil hayvan", "kategori": "Hayvanlar", "zorluk": "kolay"},
    {"kelime": "köpek", "aciklama": "Havlayan sadık dost", "kategori": "Hayvanlar", "zorluk": "kolay"},
    {"kelime": "kuş", "aciklama": "Uçabilen tüylü canlı", "kategori": "Hayvanlar", "zorluk": "kolay"},
    {"kelime": "balık", "aciklama": "Suda yaşayan canlı", "kategori": "Hayvanlar", "zorluk": "kolay"},
    {"kelime": "fare", "aciklama": "Küçük kemirgen hayvan", "kategori": "Hayvanlar", "zorluk": "kolay"},
    {"kelime": "tavuk", "aciklama": "Yumurta veren kümes hayvanı", "kategori": "Hayvanlar", "zorluk": "kolay"},
    {"kelime": "inek", "aciklama": "Süt veren çiftlik hayvanı", "kategori": "Hayvanlar", "zorluk": "kolay"},
    {"kelime": "at", "aciklama": "Binilen hızlı hayvan", "kategori": "Hayvanlar", "zorluk": "kolay"},
    {"kelime": "koyun", "aciklama": "Yünü kullanılan hayvan", "kategori": "Hayvanlar", "zorluk": "kolay"},
    {"kelime": "keçi", "aciklama": "Dağlarda yaşayan çiftlik hayvanı", "kategori": "Hayvanlar", "zorluk": "kolay"},
    
    # HAYVANLAR - Orta (5-7 harf)
    {"kelime": "aslan", "aciklama": "Ormanların kralı", "kategori": "Hayvanlar", "zorluk": "orta"},
    {"kelime": "kaplan", "aciklama": "Çizgili yırtıcı kedi", "kategori": "Hayvanlar", "zorluk": "orta"},
    {"kelime": "fil", "aciklama": "Uzun hortumlu büyük hayvan", "kategori": "Hayvanlar", "zorluk": "orta"},
    {"kelime": "zürafa", "aciklama": "En uzun boyunlu hayvan", "kategori": "Hayvanlar", "zorluk": "orta"},
    {"kelime": "maymun", "aciklama": "İnsana en yakın hayvan", "kategori": "Hayvanlar", "zorluk": "orta"},
    {"kelime": "penguen", "aciklama": "Uçamayan kutup kuşu", "kategori": "Hayvanlar", "zorluk": "orta"},
    {"kelime": "yunus", "aciklama": "Akıllı deniz memelisi", "kategori": "Hayvanlar", "zorluk": "orta"},
    {"kelime": "kartal", "aciklama": "Yırtıcı büyük kuş", "kategori": "Hayvanlar", "zorluk": "orta"},
    {"kelime": "timsah", "aciklama": "Suda yaşayan sürüngen", "kategori": "Hayvanlar", "zorluk": "orta"},
    {"kelime": "ayı", "aciklama": "Kış uykusuna yatan büyük hayvan", "kategori": "Hayvanlar", "zorluk": "orta"},
    
    # HAYVANLAR - Zor (7+ harf)
    {"kelime": "gergedan", "aciklama": "Boynuzlu kalın derili hayvan", "kategori": "Hayvanlar", "zorluk": "zor"},
    {"kelime": "flamingo", "aciklama": "Pembe renkli uzun bacaklı kuş", "kategori": "Hayvanlar", "zorluk": "zor"},
    {"kelime": "kanguru", "aciklama": "Avustralya'ya özgü zıplayan hayvan", "kategori": "Hayvanlar", "zorluk": "zor"},
    {"kelime": "bukalemun", "aciklama": "Renk değiştiren sürüngen", "kategori": "Hayvanlar", "zorluk": "zor"},
    {"kelime": "kirpi", "aciklama": "Dikenli küçük memeli", "kategori": "Hayvanlar", "zorluk": "orta"},
    
    # YEMEKLER - Kolay
    {"kelime": "ekmek", "aciklama": "Her öğün yenen temel gıda", "kategori": "Yemekler", "zorluk": "kolay"},
    {"kelime": "pilav", "aciklama": "Pirinçten yapılan yemek", "kategori": "Yemekler", "zorluk": "kolay"},
    {"kelime": "çorba", "aciklama": "Sıcak sıvı yemek", "kategori": "Yemekler", "zorluk": "kolay"},
    {"kelime": "salata", "aciklama": "Sebzelerden yapılan soğuk yemek", "kategori": "Yemekler", "zorluk": "kolay"},
    {"kelime": "makarna", "aciklama": "İtalyan mutfağının temel yemeği", "kategori": "Yemekler", "zorluk": "kolay"},
    {"kelime": "pizza", "aciklama": "Yuvarlak hamur üstüne malzeme", "kategori": "Yemekler", "zorluk": "kolay"},
    {"kelime": "döner", "aciklama": "Şişte çevrilen et", "kategori": "Yemekler", "zorluk": "kolay"},
    {"kelime": "lahmacun", "aciklama": "İnce hamur üstüne kıyma", "kategori": "Yemekler", "zorluk": "kolay"},
    {"kelime": "köfte", "aciklama": "Kıymadan yapılan yuvarlak yemek", "kategori": "Yemekler", "zorluk": "kolay"},
    {"kelime": "kebap", "aciklama": "Şişte pişirilen et", "kategori": "Yemekler", "zorluk": "kolay"},
    
    # YEMEKLER - Orta
    {"kelime": "mantı", "aciklama": "Kıymalı küçük hamur yemeği", "kategori": "Yemekler", "zorluk": "orta"},
    {"kelime": "dolma", "aciklama": "İçi doldurulmuş sebze", "kategori": "Yemekler", "zorluk": "orta"},
    {"kelime": "sarma", "aciklama": "Yaprakla sarılmış yemek", "kategori": "Yemekler", "zorluk": "orta"},
    {"kelime": "börek", "aciklama": "Yufkadan yapılan hamur işi", "kategori": "Yemekler", "zorluk": "orta"},
    {"kelime": "pide", "aciklama": "Kayık şeklinde hamur yemeği", "kategori": "Yemekler", "zorluk": "orta"},
    {"kelime": "simit", "aciklama": "Susamlı halka ekmek", "kategori": "Yemekler", "zorluk": "orta"},
    {"kelime": "poğaça", "aciklama": "Yumuşak küçük ekmek", "kategori": "Yemekler", "zorluk": "orta"},
    {"kelime": "baklava", "aciklama": "Fıstıklı tatlı", "kategori": "Yemekler", "zorluk": "orta"},
    {"kelime": "künefe", "aciklama": "Peynirli tel kadayıf tatlısı", "kategori": "Yemekler", "zorluk": "orta"},
    {"kelime": "kadayıf", "aciklama": "İnce tel şeklinde tatlı", "kategori": "Yemekler", "zorluk": "orta"},
    
    # MEYVELER - Kolay
    {"kelime": "elma", "aciklama": "Kırmızı veya yeşil yuvarlak meyve", "kategori": "Meyveler", "zorluk": "kolay"},
    {"kelime": "armut", "aciklama": "Yeşil sulu meyve", "kategori": "Meyveler", "zorluk": "kolay"},
    {"kelime": "muz", "aciklama": "Sarı uzun tropikal meyve", "kategori": "Meyveler", "zorluk": "kolay"},
    {"kelime": "portakal", "aciklama": "Turuncu sulu narenciye", "kategori": "Meyveler", "zorluk": "kolay"},
    {"kelime": "üzüm", "aciklama": "Salkım halinde küçük meyve", "kategori": "Meyveler", "zorluk": "kolay"},
    {"kelime": "kiraz", "aciklama": "Kırmızı küçük yaz meyvesi", "kategori": "Meyveler", "zorluk": "kolay"},
    {"kelime": "çilek", "aciklama": "Kırmızı kalp şeklinde meyve", "kategori": "Meyveler", "zorluk": "kolay"},
    {"kelime": "karpuz", "aciklama": "Büyük yeşil kabuklu yaz meyvesi", "kategori": "Meyveler", "zorluk": "kolay"},
    {"kelime": "kavun", "aciklama": "Sarı tatlı yaz meyvesi", "kategori": "Meyveler", "zorluk": "kolay"},
    {"kelime": "şeftali", "aciklama": "Tüylü kabuklu sulu meyve", "kategori": "Meyveler", "zorluk": "kolay"},
    
    # MEYVELER - Orta
    {"kelime": "ananas", "aciklama": "Dikenli tropikal meyve", "kategori": "Meyveler", "zorluk": "orta"},
    {"kelime": "mango", "aciklama": "Turuncu tropikal meyve", "kategori": "Meyveler", "zorluk": "orta"},
    {"kelime": "nar", "aciklama": "Kırmızı taneli meyve", "kategori": "Meyveler", "zorluk": "orta"},
    {"kelime": "incir", "aciklama": "Mor yumuşak meyve", "kategori": "Meyveler", "zorluk": "orta"},
    {"kelime": "kayısı", "aciklama": "Turuncu küçük meyve", "kategori": "Meyveler", "zorluk": "orta"},
    {"kelime": "erik", "aciklama": "Mor veya sarı küçük meyve", "kategori": "Meyveler", "zorluk": "orta"},
    {"kelime": "avokado", "aciklama": "Yeşil kremsi tropikal meyve", "kategori": "Meyveler", "zorluk": "orta"},
    {"kelime": "hindistan cevizi", "aciklama": "Sert kabuklu tropikal meyve", "kategori": "Meyveler", "zorluk": "zor"},
    
    # SEBZELER - Kolay
    {"kelime": "domates", "aciklama": "Kırmızı yuvarlak sebze", "kategori": "Sebzeler", "zorluk": "kolay"},
    {"kelime": "biber", "aciklama": "Yeşil veya kırmızı sebze", "kategori": "Sebzeler", "zorluk": "kolay"},
    {"kelime": "soğan", "aciklama": "Acı kokulu katmanlı sebze", "kategori": "Sebzeler", "zorluk": "kolay"},
    {"kelime": "patates", "aciklama": "Toprak altında yetişen sebze", "kategori": "Sebzeler", "zorluk": "kolay"},
    {"kelime": "havuç", "aciklama": "Turuncu uzun sebze", "kategori": "Sebzeler", "zorluk": "kolay"},
    {"kelime": "salatalık", "aciklama": "Yeşil uzun sulu sebze", "kategori": "Sebzeler", "zorluk": "kolay"},
    {"kelime": "marul", "aciklama": "Yeşil yapraklı salata sebzesi", "kategori": "Sebzeler", "zorluk": "kolay"},
    {"kelime": "ıspanak", "aciklama": "Yeşil yapraklı demir deposu", "kategori": "Sebzeler", "zorluk": "kolay"},
    {"kelime": "kabak", "aciklama": "Yeşil veya sarı iri sebze", "kategori": "Sebzeler", "zorluk": "kolay"},
    {"kelime": "patlıcan", "aciklama": "Mor renkli sebze", "kategori": "Sebzeler", "zorluk": "kolay"},
    
    # SEBZELER - Orta
    {"kelime": "brokoli", "aciklama": "Yeşil ağaç şeklinde sebze", "kategori": "Sebzeler", "zorluk": "orta"},
    {"kelime": "karnabahar", "aciklama": "Beyaz çiçek şeklinde sebze", "kategori": "Sebzeler", "zorluk": "orta"},
    {"kelime": "lahana", "aciklama": "Katmanlı yeşil sebze", "kategori": "Sebzeler", "zorluk": "orta"},
    {"kelime": "kereviz", "aciklama": "Aromalı yeşil sebze", "kategori": "Sebzeler", "zorluk": "orta"},
    {"kelime": "turp", "aciklama": "Kırmızı acı sebze", "kategori": "Sebzeler", "zorluk": "orta"},
    {"kelime": "sarımsak", "aciklama": "Keskin kokulu küçük sebze", "kategori": "Sebzeler", "zorluk": "orta"},
    {"kelime": "mantar", "aciklama": "Şapkalı yenilebilir canlı", "kategori": "Sebzeler", "zorluk": "orta"},
    {"kelime": "bezelye", "aciklama": "Yeşil yuvarlak taneli sebze", "kategori": "Sebzeler", "zorluk": "orta"},
    
    # MESLEKLER - Kolay
    {"kelime": "doktor", "aciklama": "Hastaları tedavi eden kişi", "kategori": "Meslekler", "zorluk": "kolay"},
    {"kelime": "öğretmen", "aciklama": "Öğrencilere ders veren kişi", "kategori": "Meslekler", "zorluk": "kolay"},
    {"kelime": "polis", "aciklama": "Güvenliği sağlayan memur", "kategori": "Meslekler", "zorluk": "kolay"},
    {"kelime": "aşçı", "aciklama": "Yemek yapan kişi", "kategori": "Meslekler", "zorluk": "kolay"},
    {"kelime": "şoför", "aciklama": "Araç kullanan kişi", "kategori": "Meslekler", "zorluk": "kolay"},
    {"kelime": "pilot", "aciklama": "Uçak kullanan kişi", "kategori": "Meslekler", "zorluk": "kolay"},
    {"kelime": "hemşire", "aciklama": "Hastanede çalışan sağlık personeli", "kategori": "Meslekler", "zorluk": "kolay"},
    {"kelime": "mühendis", "aciklama": "Teknik tasarım yapan kişi", "kategori": "Meslekler", "zorluk": "kolay"},
    {"kelime": "avukat", "aciklama": "Mahkemede savunma yapan kişi", "kategori": "Meslekler", "zorluk": "kolay"},
    {"kelime": "hakim", "aciklama": "Mahkemede karar veren kişi", "kategori": "Meslekler", "zorluk": "kolay"},
    
    # MESLEKLER - Orta
    {"kelime": "mimar", "aciklama": "Bina tasarlayan kişi", "kategori": "Meslekler", "zorluk": "orta"},
    {"kelime": "ressam", "aciklama": "Tablo yapan sanatçı", "kategori": "Meslekler", "zorluk": "orta"},
    {"kelime": "müzisyen", "aciklama": "Müzik yapan sanatçı", "kategori": "Meslekler", "zorluk": "orta"},
    {"kelime": "cerrah", "aciklama": "Ameliyat yapan doktor", "kategori": "Meslekler", "zorluk": "orta"},
    {"kelime": "veteriner", "aciklama": "Hayvanları tedavi eden doktor", "kategori": "Meslekler", "zorluk": "orta"},
    {"kelime": "eczacı", "aciklama": "İlaç satan kişi", "kategori": "Meslekler", "zorluk": "orta"},
    {"kelime": "gazeteci", "aciklama": "Haber yapan kişi", "kategori": "Meslekler", "zorluk": "orta"},
    {"kelime": "tercüman", "aciklama": "Dil çeviren kişi", "kategori": "Meslekler", "zorluk": "orta"},
    {"kelime": "psikolog", "aciklama": "Ruh sağlığı uzmanı", "kategori": "Meslekler", "zorluk": "orta"},
    {"kelime": "astronot", "aciklama": "Uzaya giden kişi", "kategori": "Meslekler", "zorluk": "orta"},
    
    # EŞYALAR - Kolay
    {"kelime": "masa", "aciklama": "Üstüne eşya konulan mobilya", "kategori": "Eşyalar", "zorluk": "kolay"},
    {"kelime": "sandalye", "aciklama": "Üstüne oturulan mobilya", "kategori": "Eşyalar", "zorluk": "kolay"},
    {"kelime": "yatak", "aciklama": "Üstünde uyunan mobilya", "kategori": "Eşyalar", "zorluk": "kolay"},
    {"kelime": "dolap", "aciklama": "Eşya saklanan mobilya", "kategori": "Eşyalar", "zorluk": "kolay"},
    {"kelime": "koltuk", "aciklama": "Rahat oturmalık", "kategori": "Eşyalar", "zorluk": "kolay"},
    {"kelime": "ayna", "aciklama": "Yansıma gösteren cam", "kategori": "Eşyalar", "zorluk": "kolay"},
    {"kelime": "saat", "aciklama": "Zamanı gösteren alet", "kategori": "Eşyalar", "zorluk": "kolay"},
    {"kelime": "telefon", "aciklama": "İletişim cihazı", "kategori": "Eşyalar", "zorluk": "kolay"},
    {"kelime": "bilgisayar", "aciklama": "Elektronik hesap makinesi", "kategori": "Eşyalar", "zorluk": "kolay"},
    {"kelime": "televizyon", "aciklama": "Görüntü yayını gösteren cihaz", "kategori": "Eşyalar", "zorluk": "kolay"},
    
    # EŞYALAR - Orta
    {"kelime": "buzdolabı", "aciklama": "Yiyecek soğutan beyaz eşya", "kategori": "Eşyalar", "zorluk": "orta"},
    {"kelime": "çamaşır makinesi", "aciklama": "Giysi yıkayan cihaz", "kategori": "Eşyalar", "zorluk": "orta"},
    {"kelime": "fırın", "aciklama": "Yemek pişiren cihaz", "kategori": "Eşyalar", "zorluk": "orta"},
    {"kelime": "mikrofon", "aciklama": "Ses ileten cihaz", "kategori": "Eşyalar", "zorluk": "orta"},
    {"kelime": "hoparlör", "aciklama": "Ses yayan cihaz", "kategori": "Eşyalar", "zorluk": "orta"},
    {"kelime": "kulaklık", "aciklama": "Kulağa takılan ses cihazı", "kategori": "Eşyalar", "zorluk": "orta"},
    {"kelime": "şarj aleti", "aciklama": "Pil dolduran cihaz", "kategori": "Eşyalar", "zorluk": "orta"},
    {"kelime": "klima", "aciklama": "Havayı soğutan cihaz", "kategori": "Eşyalar", "zorluk": "orta"},
    
    # DOĞA - Kolay
    {"kelime": "güneş", "aciklama": "Dünyayı aydınlatan yıldız", "kategori": "Doğa", "zorluk": "kolay"},
    {"kelime": "ay", "aciklama": "Dünya'nın uydusu", "kategori": "Doğa", "zorluk": "kolay"},
    {"kelime": "yıldız", "aciklama": "Geceleyin parlayan cisim", "kategori": "Doğa", "zorluk": "kolay"},
    {"kelime": "bulut", "aciklama": "Gökyüzündeki su buharı", "kategori": "Doğa", "zorluk": "kolay"},
    {"kelime": "yağmur", "aciklama": "Gökten düşen su", "kategori": "Doğa", "zorluk": "kolay"},
    {"kelime": "kar", "aciklama": "Beyaz donmuş su taneleri", "kategori": "Doğa", "zorluk": "kolay"},
    {"kelime": "rüzgar", "aciklama": "Hareket eden hava", "kategori": "Doğa", "zorluk": "kolay"},
    {"kelime": "deniz", "aciklama": "Büyük tuzlu su kütlesi", "kategori": "Doğa", "zorluk": "kolay"},
    {"kelime": "nehir", "aciklama": "Akan tatlı su", "kategori": "Doğa", "zorluk": "kolay"},
    {"kelime": "göl", "aciklama": "Durgun su birikintisi", "kategori": "Doğa", "zorluk": "kolay"},
    
    # DOĞA - Orta
    {"kelime": "orman", "aciklama": "Ağaçlarla kaplı alan", "kategori": "Doğa", "zorluk": "orta"},
    {"kelime": "dağ", "aciklama": "Yüksek kara parçası", "kategori": "Doğa", "zorluk": "orta"},
    {"kelime": "vadi", "aciklama": "Dağlar arasındaki çukur", "kategori": "Doğa", "zorluk": "orta"},
    {"kelime": "şelale", "aciklama": "Yüksekten düşen su", "kategori": "Doğa", "zorluk": "orta"},
    {"kelime": "volkan", "aciklama": "Lav püskürten dağ", "kategori": "Doğa", "zorluk": "orta"},
    {"kelime": "deprem", "aciklama": "Yer kabuğu sarsıntısı", "kategori": "Doğa", "zorluk": "orta"},
    {"kelime": "tsunami", "aciklama": "Dev deniz dalgası", "kategori": "Doğa", "zorluk": "orta"},
    {"kelime": "gökkuşağı", "aciklama": "Yağmur sonrası renkli yay", "kategori": "Doğa", "zorluk": "orta"},
    {"kelime": "fırtına", "aciklama": "Şiddetli hava olayı", "kategori": "Doğa", "zorluk": "orta"},
    {"kelime": "kasırga", "aciklama": "Dönen şiddetli rüzgar", "kategori": "Doğa", "zorluk": "orta"},
    
    # SPOR - Kolay
    {"kelime": "futbol", "aciklama": "Top ile oynanan takım sporu", "kategori": "Spor", "zorluk": "kolay"},
    {"kelime": "basketbol", "aciklama": "Potaya top atılan spor", "kategori": "Spor", "zorluk": "kolay"},
    {"kelime": "voleybol", "aciklama": "File üzerinden oynanan spor", "kategori": "Spor", "zorluk": "kolay"},
    {"kelime": "tenis", "aciklama": "Raket ile oynanan spor", "kategori": "Spor", "zorluk": "kolay"},
    {"kelime": "yüzme", "aciklama": "Suda yapılan spor", "kategori": "Spor", "zorluk": "kolay"},
    {"kelime": "koşu", "aciklama": "Hızlı yürüme sporu", "kategori": "Spor", "zorluk": "kolay"},
    {"kelime": "boks", "aciklama": "Yumruk ile dövüş sporu", "kategori": "Spor", "zorluk": "kolay"},
    {"kelime": "güreş", "aciklama": "Geleneksel dövüş sporu", "kategori": "Spor", "zorluk": "kolay"},
    {"kelime": "kayak", "aciklama": "Karda yapılan kış sporu", "kategori": "Spor", "zorluk": "kolay"},
    {"kelime": "bisiklet", "aciklama": "İki tekerlekli araç sporu", "kategori": "Spor", "zorluk": "kolay"},
    
    # SPOR - Orta
    {"kelime": "atletizm", "aciklama": "Koşu ve atlama sporları", "kategori": "Spor", "zorluk": "orta"},
    {"kelime": "jimnastik", "aciklama": "Akrobasi ve esneme sporu", "kategori": "Spor", "zorluk": "orta"},
    {"kelime": "eskrim", "aciklama": "Kılıç ile yapılan spor", "kategori": "Spor", "zorluk": "orta"},
    {"kelime": "okçuluk", "aciklama": "Ok ve yay ile yapılan spor", "kategori": "Spor", "zorluk": "orta"},
    {"kelime": "halter", "aciklama": "Ağırlık kaldırma sporu", "kategori": "Spor", "zorluk": "orta"},
    {"kelime": "kürek", "aciklama": "Suda çekme sporu", "kategori": "Spor", "zorluk": "orta"},
    {"kelime": "yelken", "aciklama": "Rüzgar ile deniz sporu", "kategori": "Spor", "zorluk": "orta"},
    {"kelime": "dalış", "aciklama": "Su altı sporu", "kategori": "Spor", "zorluk": "orta"},
    {"kelime": "buz pateni", "aciklama": "Buz üstünde kayma sporu", "kategori": "Spor", "zorluk": "orta"},
    {"kelime": "golf", "aciklama": "Top ve sopa ile oynanan spor", "kategori": "Spor", "zorluk": "orta"},
    
    # ÜLKELER - Kolay
    {"kelime": "türkiye", "aciklama": "Anadolu'daki ülkemiz", "kategori": "Coğrafya", "zorluk": "kolay"},
    {"kelime": "almanya", "aciklama": "Avrupa'nın merkez ülkesi", "kategori": "Coğrafya", "zorluk": "kolay"},
    {"kelime": "fransa", "aciklama": "Eyfel Kulesi'nin ülkesi", "kategori": "Coğrafya", "zorluk": "kolay"},
    {"kelime": "italya", "aciklama": "Pizza ve makarna ülkesi", "kategori": "Coğrafya", "zorluk": "kolay"},
    {"kelime": "ispanya", "aciklama": "Flamenko dansının ülkesi", "kategori": "Coğrafya", "zorluk": "kolay"},
    {"kelime": "ingiltere", "aciklama": "Kraliçe'nin ülkesi", "kategori": "Coğrafya", "zorluk": "kolay"},
    {"kelime": "japonya", "aciklama": "Uzak Doğu'nun ada ülkesi", "kategori": "Coğrafya", "zorluk": "kolay"},
    {"kelime": "çin", "aciklama": "Çin Seddi'nin ülkesi", "kategori": "Coğrafya", "zorluk": "kolay"},
    {"kelime": "rusya", "aciklama": "Dünyanın en büyük ülkesi", "kategori": "Coğrafya", "zorluk": "kolay"},
    {"kelime": "amerika", "aciklama": "Özgürlük Heykeli'nin ülkesi", "kategori": "Coğrafya", "zorluk": "kolay"},
    
    # ŞEHİRLER - Orta
    {"kelime": "istanbul", "aciklama": "İki kıtayı birleştiren şehir", "kategori": "Coğrafya", "zorluk": "orta"},
    {"kelime": "ankara", "aciklama": "Türkiye'nin başkenti", "kategori": "Coğrafya", "zorluk": "orta"},
    {"kelime": "izmir", "aciklama": "Ege'nin incisi", "kategori": "Coğrafya", "zorluk": "orta"},
    {"kelime": "antalya", "aciklama": "Turizm cenneti şehir", "kategori": "Coğrafya", "zorluk": "orta"},
    {"kelime": "paris", "aciklama": "Aşk şehri", "kategori": "Coğrafya", "zorluk": "orta"},
    {"kelime": "londra", "aciklama": "Big Ben'in şehri", "kategori": "Coğrafya", "zorluk": "orta"},
    {"kelime": "roma", "aciklama": "Kolezyum'un şehri", "kategori": "Coğrafya", "zorluk": "orta"},
    {"kelime": "tokyo", "aciklama": "Japonya'nın başkenti", "kategori": "Coğrafya", "zorluk": "orta"},
    {"kelime": "moskova", "aciklama": "Rusya'nın başkenti", "kategori": "Coğrafya", "zorluk": "orta"},
    {"kelime": "berlin", "aciklama": "Almanya'nın başkenti", "kategori": "Coğrafya", "zorluk": "orta"},
    
    # RENKLER - Kolay
    {"kelime": "kırmızı", "aciklama": "Kanın rengi", "kategori": "Renkler", "zorluk": "kolay"},
    {"kelime": "mavi", "aciklama": "Gökyüzünün rengi", "kategori": "Renkler", "zorluk": "kolay"},
    {"kelime": "yeşil", "aciklama": "Yaprakların rengi", "kategori": "Renkler", "zorluk": "kolay"},
    {"kelime": "sarı", "aciklama": "Güneşin rengi", "kategori": "Renkler", "zorluk": "kolay"},
    {"kelime": "turuncu", "aciklama": "Portakalın rengi", "kategori": "Renkler", "zorluk": "kolay"},
    {"kelime": "mor", "aciklama": "Patlıcanın rengi", "kategori": "Renkler", "zorluk": "kolay"},
    {"kelime": "pembe", "aciklama": "Açık kırmızı renk", "kategori": "Renkler", "zorluk": "kolay"},
    {"kelime": "beyaz", "aciklama": "Karın rengi", "kategori": "Renkler", "zorluk": "kolay"},
    {"kelime": "siyah", "aciklama": "Gecenin rengi", "kategori": "Renkler", "zorluk": "kolay"},
    {"kelime": "gri", "aciklama": "Bulutların rengi", "kategori": "Renkler", "zorluk": "kolay"},
    
    # BİLİM - Orta
    {"kelime": "atom", "aciklama": "Maddenin en küçük yapı taşı", "kategori": "Bilim", "zorluk": "orta"},
    {"kelime": "molekül", "aciklama": "Atomların birleşimi", "kategori": "Bilim", "zorluk": "orta"},
    {"kelime": "hücre", "aciklama": "Canlıların yapı taşı", "kategori": "Bilim", "zorluk": "orta"},
    {"kelime": "gen", "aciklama": "Kalıtım birimi", "kategori": "Bilim", "zorluk": "orta"},
    {"kelime": "oksijen", "aciklama": "Solunumda kullanılan gaz", "kategori": "Bilim", "zorluk": "orta"},
    {"kelime": "hidrojen", "aciklama": "En hafif element", "kategori": "Bilim", "zorluk": "orta"},
    {"kelime": "karbon", "aciklama": "Organik bileşiklerin temeli", "kategori": "Bilim", "zorluk": "orta"},
    {"kelime": "yerçekimi", "aciklama": "Cisimleri çeken kuvvet", "kategori": "Bilim", "zorluk": "orta"},
    {"kelime": "elektrik", "aciklama": "Elektronların akışı", "kategori": "Bilim", "zorluk": "orta"},
    {"kelime": "manyetik", "aciklama": "Mıknatısla ilgili", "kategori": "Bilim", "zorluk": "orta"},
    
    # BİLİM - Zor
    {"kelime": "fotosentez", "aciklama": "Bitkilerin besin üretimi", "kategori": "Bilim", "zorluk": "zor"},
    {"kelime": "evrim", "aciklama": "Canlıların değişim süreci", "kategori": "Bilim", "zorluk": "zor"},
    {"kelime": "görelilik", "aciklama": "Einstein'ın teorisi", "kategori": "Bilim", "zorluk": "zor"},
    {"kelime": "kuantum", "aciklama": "Atom altı fizik dalı", "kategori": "Bilim", "zorluk": "zor"},
    {"kelime": "antimadde", "aciklama": "Maddenin zıt hali", "kategori": "Bilim", "zorluk": "zor"},
    
    # MÜZİK - Kolay
    {"kelime": "gitar", "aciklama": "Telli çalgı aleti", "kategori": "Müzik", "zorluk": "kolay"},
    {"kelime": "piyano", "aciklama": "Tuşlu büyük çalgı", "kategori": "Müzik", "zorluk": "kolay"},
    {"kelime": "keman", "aciklama": "Yaylı telli çalgı", "kategori": "Müzik", "zorluk": "kolay"},
    {"kelime": "davul", "aciklama": "Vurmalı çalgı", "kategori": "Müzik", "zorluk": "kolay"},
    {"kelime": "flüt", "aciklama": "Üflemeli nefesli çalgı", "kategori": "Müzik", "zorluk": "kolay"},
    {"kelime": "saz", "aciklama": "Türk halk müziği çalgısı", "kategori": "Müzik", "zorluk": "kolay"},
    {"kelime": "ney", "aciklama": "Kamıştan nefesli çalgı", "kategori": "Müzik", "zorluk": "kolay"},
    {"kelime": "ud", "aciklama": "Telli Doğu çalgısı", "kategori": "Müzik", "zorluk": "kolay"},
    {"kelime": "akordeon", "aciklama": "Körüklü çalgı", "kategori": "Müzik", "zorluk": "orta"},
    {"kelime": "org", "aciklama": "Elektronik klavye", "kategori": "Müzik", "zorluk": "kolay"},
    
    # ULAŞIM - Kolay
    {"kelime": "araba", "aciklama": "Dört tekerlekli kara taşıtı", "kategori": "Ulaşım", "zorluk": "kolay"},
    {"kelime": "otobüs", "aciklama": "Toplu taşıma aracı", "kategori": "Ulaşım", "zorluk": "kolay"},
    {"kelime": "tren", "aciklama": "Raylarda giden taşıt", "kategori": "Ulaşım", "zorluk": "kolay"},
    {"kelime": "uçak", "aciklama": "Havada uçan taşıt", "kategori": "Ulaşım", "zorluk": "kolay"},
    {"kelime": "gemi", "aciklama": "Denizde giden büyük taşıt", "kategori": "Ulaşım", "zorluk": "kolay"},
    {"kelime": "helikopter", "aciklama": "Pervaneli hava taşıtı", "kategori": "Ulaşım", "zorluk": "kolay"},
    {"kelime": "motosiklet", "aciklama": "İki tekerlekli motorlu taşıt", "kategori": "Ulaşım", "zorluk": "kolay"},
    {"kelime": "metro", "aciklama": "Yeraltı treni", "kategori": "Ulaşım", "zorluk": "kolay"},
    {"kelime": "tramvay", "aciklama": "Şehir içi raylı taşıt", "kategori": "Ulaşım", "zorluk": "kolay"},
    {"kelime": "taksi", "aciklama": "Kiralık yolcu taşıtı", "kategori": "Ulaşım", "zorluk": "kolay"},
    
    # DUYGULAR - Kolay
    {"kelime": "mutlu", "aciklama": "Sevinçli ruh hali", "kategori": "Duygular", "zorluk": "kolay"},
    {"kelime": "üzgün", "aciklama": "Kederli ruh hali", "kategori": "Duygular", "zorluk": "kolay"},
    {"kelime": "kızgın", "aciklama": "Öfkeli ruh hali", "kategori": "Duygular", "zorluk": "kolay"},
    {"kelime": "korku", "aciklama": "Tehlike karşısında duyulan his", "kategori": "Duygular", "zorluk": "kolay"},
    {"kelime": "sevgi", "aciklama": "Birini beğenme hissi", "kategori": "Duygular", "zorluk": "kolay"},
    {"kelime": "nefret", "aciklama": "Sevginin karşıtı", "kategori": "Duygular", "zorluk": "kolay"},
    {"kelime": "umut", "aciklama": "İyi şeyler bekleme hissi", "kategori": "Duygular", "zorluk": "kolay"},
    {"kelime": "hayal", "aciklama": "Gerçek olmayan düşünce", "kategori": "Duygular", "zorluk": "kolay"},
    {"kelime": "merak", "aciklama": "Öğrenme isteği", "kategori": "Duygular", "zorluk": "kolay"},
    {"kelime": "heyecan", "aciklama": "Yoğun coşku hissi", "kategori": "Duygular", "zorluk": "kolay"},
    
    # EĞİTİM - Kolay
    {"kelime": "okul", "aciklama": "Eğitim verilen kurum", "kategori": "Eğitim", "zorluk": "kolay"},
    {"kelime": "sınıf", "aciklama": "Öğrencilerin ders gördüğü oda", "kategori": "Eğitim", "zorluk": "kolay"},
    {"kelime": "kitap", "aciklama": "Yazılı bilgi kaynağı", "kategori": "Eğitim", "zorluk": "kolay"},
    {"kelime": "defter", "aciklama": "Not yazılan kağıt topluluğu", "kategori": "Eğitim", "zorluk": "kolay"},
    {"kelime": "kalem", "aciklama": "Yazı yazmaya yarayan alet", "kategori": "Eğitim", "zorluk": "kolay"},
    {"kelime": "silgi", "aciklama": "Kurşun kalem izini temizleyen", "kategori": "Eğitim", "zorluk": "kolay"},
    {"kelime": "cetvel", "aciklama": "Düz çizgi çekmeye yarayan alet", "kategori": "Eğitim", "zorluk": "kolay"},
    {"kelime": "pergel", "aciklama": "Daire çizmeye yarayan alet", "kategori": "Eğitim", "zorluk": "kolay"},
    {"kelime": "sınav", "aciklama": "Bilgi ölçme testi", "kategori": "Eğitim", "zorluk": "kolay"},
    {"kelime": "ödev", "aciklama": "Evde yapılan okul çalışması", "kategori": "Eğitim", "zorluk": "kolay"},
    
    # TEKNOLOJİ - Orta
    {"kelime": "internet", "aciklama": "Küresel bilgisayar ağı", "kategori": "Teknoloji", "zorluk": "orta"},
    {"kelime": "yazılım", "aciklama": "Bilgisayar programı", "kategori": "Teknoloji", "zorluk": "orta"},
    {"kelime": "donanım", "aciklama": "Bilgisayarın fiziksel parçaları", "kategori": "Teknoloji", "zorluk": "orta"},
    {"kelime": "uygulama", "aciklama": "Telefon programı", "kategori": "Teknoloji", "zorluk": "orta"},
    {"kelime": "veritabanı", "aciklama": "Bilgi depolama sistemi", "kategori": "Teknoloji", "zorluk": "orta"},
    {"kelime": "algoritma", "aciklama": "Problem çözme adımları", "kategori": "Teknoloji", "zorluk": "orta"},
    {"kelime": "şifreleme", "aciklama": "Veri güvenlik yöntemi", "kategori": "Teknoloji", "zorluk": "orta"},
    {"kelime": "bulut", "aciklama": "Uzaktan veri depolama", "kategori": "Teknoloji", "zorluk": "orta"},
    {"kelime": "yapay zeka", "aciklama": "Makine öğrenmesi teknolojisi", "kategori": "Teknoloji", "zorluk": "zor"},
    {"kelime": "robot", "aciklama": "Otomatik çalışan makine", "kategori": "Teknoloji", "zorluk": "orta"},
]

def add_words():
    """Kelimeleri veritabanına ekler"""
    added = 0
    skipped = 0
    
    for word_data in KELIMELER:
        kelime = word_data["kelime"]
        
        # Kelime zaten var mı kontrol et
        existing = words_collection.find_one({"kelime": kelime})
        if existing:
            skipped += 1
            continue
        
        # Yeni kelime dokümanı oluştur
        doc = {
            "kelime": kelime,
            "aciklama": word_data["aciklama"],
            "kategori": word_data["kategori"],
            "zorluk": word_data["zorluk"],
            "harf_sayisi": len(kelime.replace(" ", "")),
            "metadata": {
                "is_active": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "times_used": 0,
                "times_correct": 0,
                "times_wrong": 0,
                "success_rate": 0
            }
        }
        
        words_collection.insert_one(doc)
        added += 1
        print(f"✅ Eklendi: {kelime} ({word_data['kategori']} - {word_data['zorluk']})")
    
    print(f"\n{'='*50}")
    print(f"📊 SONUÇ:")
    print(f"   ✅ Eklenen: {added}")
    print(f"   ⏭️  Atlanan (zaten var): {skipped}")
    print(f"   📝 Toplam kelime sayısı: {words_collection.count_documents({})}")
    print(f"   🟢 Aktif kelime sayısı: {words_collection.count_documents({'metadata.is_active': True})}")
    
    # Kategori bazlı istatistik
    print(f"\n📂 KATEGORİ BAZLI:")
    pipeline = [
        {"$match": {"metadata.is_active": True}},
        {"$group": {"_id": "$kategori", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    for cat in words_collection.aggregate(pipeline):
        print(f"   • {cat['_id']}: {cat['count']} kelime")
    
    # Zorluk bazlı istatistik
    print(f"\n📊 ZORLUK BAZLI:")
    pipeline = [
        {"$match": {"metadata.is_active": True}},
        {"$group": {"_id": "$zorluk", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    for diff in words_collection.aggregate(pipeline):
        print(f"   • {diff['_id']}: {diff['count']} kelime")

if __name__ == "__main__":
    print("🚀 Türkçe Kelime Ekleme Scripti Başlatılıyor...")
    print(f"📍 Veritabanı: {db_name}")
    print("="*50)
    add_words()
