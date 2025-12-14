# routes/game.py
# Tam güncellenmiş: checkpoint index takibi, puan_delta düzeltmeleri, güvenli DB kontrolleri, puan mantığı (remaining*100)

from flask import Blueprint, request, jsonify, current_app
from models.word import Word
from models.user import User
from models.game_history import GameHistory
from models.active_game import ActiveGame
from bson.objectid import ObjectId
from pymongo import ReturnDocument
import jwt
import time
from functools import wraps
from config import Config
import random
from services.difficulty_adapter import calculate_difficulty_modifier
from services.leaderboard import aggregate_leaderboard, get_recent_finishers
from services.settings import get_game_settings
from datetime import datetime

game_bp = Blueprint('game', __name__)

# --- Helper decorators ---
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.method == 'OPTIONS':
            return current_app.make_default_options_response()
        token = None
        auth_header = request.headers.get('Authorization', '')
        if auth_header:
            parts = auth_header.split()
            if len(parts) >= 2:
                token = parts[1]
        if not token:
            return jsonify({'message': 'Token eksik!'}), 401
        try:
            data = jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
            current_user_id = data['user_id']
        except Exception:
            return jsonify({'message': 'Token geçersiz!'}), 401
        return f(current_user_id, *args, **kwargs)
    return decorated

def kelime_gosterim_getir(kelime, aciklanan_harfler):
    gosterim = []
    for i, harf in enumerate(kelime):
        if i in aciklanan_harfler:
            gosterim.append(harf)
        else:
            gosterim.append('_')
    return ' '.join(gosterim)

def temizle_ve_buyut(metin):
    if not metin:
        return ""
    metin = metin.upper().strip()
    metin = metin.replace('Ç', 'C').replace('Ğ', 'G').replace('İ', 'I').replace('Ö', 'O').replace('Ş', 'S').replace('Ü', 'U')
    return metin

# routes/game.py - SADECE KRİTİK OYUN_SONU_ISLE FONKSİYONU GÜNCELLENMİŞ
# Diğer fonksiyonlar aynı kalacak, sadece oyun_sonu_isle değişecek

# routes/game.py - SADECE KRİTİK OYUN_SONU_ISLE FONKSİYONU GÜNCELLENMİŞ
# Diğer fonksiyonlar aynı kalacak, sadece oyun_sonu_isle değişecek

def oyun_sonu_isle(current_user_id, oyun, neden="süre_doldu"):
    """
    GÜNCELLENMİŞ: Basitleştirilmiş ve güvenilir oyun sonu işlemleri
    + Günlük görev ilerlemesi güncelleme
    + Başarım kontrolü
    """
    final_puan = oyun.get('puan', 0)
    db = current_app.db
    user_model = User(db)
    game_history_model = GameHistory(db)
    active_game_model = ActiveGame(db)

    # Oyun içi sayaçlardan istatistikleri çıkar
    correct = oyun.get('correct_count', 0)
    wrong = oyun.get('wrong_count', 0)
    oyun_puan_delta = oyun.get('puan_delta', final_puan)
    current_streak = oyun.get('current_streak', 0)
    longest_streak = oyun.get('longest_streak', 0)

    print(f"🎯 Oyun sonu işlemleri: {current_user_id}, Puan: {final_puan}, Doğru: {correct}, Yanlış: {wrong}")

    active_game = active_game_model.get_game(current_user_id)
    gh_id = active_game.get('game_history_id') if active_game else None

    if gh_id:
        try:
            total_questions = oyun.get('toplam_sorular') or oyun.get('asked_questions', 0)
            duration = None
            try:
                toplam_sure = float(oyun.get('toplam_sure', 0))
                kalan_sure = float(oyun.get('kalan_sure', 0))
                duration = max(toplam_sure - kalan_sure, 0)
            except (TypeError, ValueError):
                duration = None
            categories = oyun.get('categories')
            game_history_model.finalize_game(
                gh_id,
                final_puan,
                correct_answers=correct,
                total_questions=total_questions,
                duration=duration,
                categories=categories
            )
            print(f"✅ GameHistory finalize edildi: {gh_id}")
        except Exception as e:
            print(f"❌ GameHistory finalize error: {e}")

    try:
        success = user_model.update_after_game(
            current_user_id,
            final_puan, correct, wrong, oyun_puan_delta, current_streak, longest_streak
        )
        if success:
            print(f"✅ Kullanıcı istatistikleri güncellendi: {current_user_id}")
        else:
            print(f"❌ Kullanıcı istatistikleri güncellenemedi: {current_user_id}")
    except Exception as e:
        print(f"❌ Kullanıcı istatistikleri güncellenirken hata: {e}")

    try:
        if correct + wrong > 0:
            success_rate = correct / (correct + wrong)
            user_model.update_adaptive_difficulty(current_user_id, success_rate)
            print(f"✅ Zorluk seviyesi güncellendi: {success_rate:.2f}")
    except Exception as e:
        print(f"❌ Zorluk güncelleme hatası: {e}")

    # Günlük görevleri güncelle
    try:
        from models.daily_task import DailyTask
        daily_task_model = DailyTask(db)
        daily_task_model.update_progress(current_user_id, 'games_played', 1)
        daily_task_model.update_progress(current_user_id, 'correct_answers', correct)
        daily_task_model.update_progress(current_user_id, 'score_earned', oyun_puan_delta)
        daily_task_model.update_progress(current_user_id, 'best_streak', longest_streak, increment=False)
        print(f"✅ Günlük görevler güncellendi: {current_user_id}")
    except Exception as e:
        print(f"⚠️ Günlük görev güncelleme hatası: {e}")

    # Başarımları kontrol et
    unlocked_achievements = []
    try:
        user = user_model.find_by_id(current_user_id)
        game_data = {
            'correct_answers': correct,
            'total_questions': oyun.get('toplam_sorular', 0),
            'final_score': final_puan
        }
        unlocked_achievements = check_achievements_for_user(user, game_data)
        if unlocked_achievements:
            achievement_ids = [a['id'] for a in unlocked_achievements]
            user_model.add_achievements(current_user_id, achievement_ids, source='game')
            print(f"✅ Yeni başarımlar: {achievement_ids}")
    except Exception as e:
        print(f"⚠️ Başarım kontrol hatası: {e}")

    try:
        active_game_model.delete_game(current_user_id)
        print(f"✅ Aktif oyun kaydı silindi: {current_user_id}")
    except Exception as e:
        print(f"❌ Aktif oyun silinirken hata: {e}")

    print(f"🎯 Oyun tamamen sonlandırıldı: {current_user_id}, Neden: {neden}")
    return {
        'oyun_bitti': True,
        'puan': final_puan,
        'mesaj': f'Oyun bitti! Toplam puanınız: {final_puan}.',
        'correct_answers': correct,
        'wrong_answers': wrong,
        'unlocked_achievements': unlocked_achievements
    }

# --- ROUTES ---
# Başarım tanımları - Frontend ile senkronize
ACHIEVEMENT_DEFINITIONS = {
    'FIRST_GAME': {
        'id': 'FIRST_GAME',
        'name': 'İlk Oyun',
        'description': 'İlk oyununu tamamla',
        'icon': '🎮',
        'condition': lambda user, game: user.get('statistics', {}).get('games_played', 0) >= 1
    },
    'STREAK_5': {
        'id': 'STREAK_5',
        'name': 'Ateşli Seri',
        'description': '5 soru üst üste doğru cevapla',
        'icon': '🔥',
        'condition': lambda user, game: user.get('statistics', {}).get('longest_streak', 0) >= 5
    },
    'PERFECT_GAME': {
        'id': 'PERFECT_GAME',
        'name': 'Kusursuz Oyun',
        'description': 'Bir oyunda tüm soruları doğru cevapla',
        'icon': '⭐',
        'condition': lambda user, game: game and game.get('correct_answers', 0) == game.get('total_questions', 0) and game.get('total_questions', 0) > 0
    },
    'SCORE_1000': {
        'id': 'SCORE_1000',
        'name': 'Puan Avcısı',
        'description': '1000 puan topla',
        'icon': '🏆',
        'condition': lambda user, game: user.get('statistics', {}).get('total_score', 0) >= 1000
    },
    'SCORE_5000': {
        'id': 'SCORE_5000',
        'name': 'Puan Ustası',
        'description': '5000 puan topla',
        'icon': '💎',
        'condition': lambda user, game: user.get('statistics', {}).get('total_score', 0) >= 5000
    },
    'SCORE_10000': {
        'id': 'SCORE_10000',
        'name': 'Puan Efsanesi',
        'description': '10000 puan topla',
        'icon': '👑',
        'condition': lambda user, game: user.get('statistics', {}).get('total_score', 0) >= 10000
    },
    'CATEGORY_MASTER': {
        'id': 'CATEGORY_MASTER',
        'name': 'Kategori Ustası',
        'description': 'Bir kategoride 10 doğru cevap ver',
        'icon': '📚',
        'condition': lambda user, game: user.get('statistics', {}).get('total_correct_answers', 0) >= 10
    },
    'WORD_EXPLORER': {
        'id': 'WORD_EXPLORER',
        'name': 'Kelime Kaşifi',
        'description': '50 farklı kelime çöz',
        'icon': '🔍',
        'condition': lambda user, game: user.get('statistics', {}).get('total_correct_answers', 0) >= 50
    },
    'CONSISTENT_PLAYER': {
        'id': 'CONSISTENT_PLAYER',
        'name': 'Düzenli Oyuncu',
        'description': '10 oyun tamamla',
        'icon': '📅',
        'condition': lambda user, game: user.get('statistics', {}).get('games_played', 0) >= 10
    },
    'VETERAN_PLAYER': {
        'id': 'VETERAN_PLAYER',
        'name': 'Deneyimli Oyuncu',
        'description': '50 oyun tamamla',
        'icon': '🎖️',
        'condition': lambda user, game: user.get('statistics', {}).get('games_played', 0) >= 50
    },
    'STREAK_10': {
        'id': 'STREAK_10',
        'name': 'Seri Ustası',
        'description': '10 doğru cevap serisi yap',
        'icon': '⚡',
        'condition': lambda user, game: user.get('statistics', {}).get('longest_streak', 0) >= 10
    },
    'HIGH_ACCURACY': {
        'id': 'HIGH_ACCURACY',
        'name': 'Keskin Nişancı',
        'description': '%80 üzeri başarı oranı (en az 20 soru)',
        'icon': '🎯',
        'condition': lambda user, game: user.get('statistics', {}).get('success_rate', 0) >= 80 and user.get('statistics', {}).get('total_questions_answered', 0) >= 20
    }
}

def check_achievements_for_user(user, game_data=None):
    """
    Kullanıcının kazanabileceği başarımları kontrol eder.
    Sadece henüz kazanılmamış başarımları döndürür.
    """
    existing_ids = set(a.get('id') for a in user.get('achievements', []))
    newly_unlocked = []
    
    for achievement_id, achievement in ACHIEVEMENT_DEFINITIONS.items():
        if achievement_id in existing_ids:
            continue
        try:
            if achievement['condition'](user, game_data):
                newly_unlocked.append({
                    'id': achievement['id'],
                    'name': achievement['name'],
                    'description': achievement['description'],
                    'icon': achievement['icon']
                })
        except Exception as e:
            print(f"⚠️ Achievement condition check error ({achievement_id}): {e}")
            continue
    
    return newly_unlocked

@game_bp.route('/check-achievements', methods=['POST'])
@token_required
def check_achievements(current_user_id):
    """
    Frontend'den gelen gameData ile achievement kontrolü yapar.
    Body: { "correct_answers": 5, "total_questions": 10, "final_score": 1000 }
    """
    try:
        data = request.get_json() or {}
        db = current_app.db
        user_model = User(db)
        
        # Kullanıcıyı al
        user = user_model.find_by_id(current_user_id)
        if not user:
            return jsonify({"error": "Kullanıcı bulunamadı"}), 404
        
        # Game data hazırla
        game_data = {
            'correct_answers': data.get('correct_answers', 0),
            'total_questions': data.get('total_questions', 0),
            'final_score': data.get('final_score', 0)
        }
        
        # Başarımları kontrol et
        unlocked_achievements = check_achievements_for_user(user, game_data)
        
        # Kazanılan başarımları kullanıcıya ekle (duplicate kontrolü add_achievements içinde)
        if unlocked_achievements:
            achievement_ids = [a['id'] for a in unlocked_achievements]
            user_model.add_achievements(current_user_id, achievement_ids, source='game')
        
        return jsonify({
            "unlocked_achievements": unlocked_achievements,
            "message": f"{len(unlocked_achievements)} yeni başarım kazanıldı" if unlocked_achievements else "Yeni başarım yok"
        })
        
    except Exception as e:
        print(f"❌ Achievement kontrolü hatası: {e}")
        return jsonify({"error": f"Sunucu hatası: {str(e)}"}), 500

@game_bp.route('/achievements', methods=['GET'])
@token_required
def get_all_achievements(current_user_id):
    """
    Tüm başarımları ve kullanıcının durumunu döndürür.
    """
    try:
        db = current_app.db
        user_model = User(db)
        user = user_model.find_by_id(current_user_id)
        
        if not user:
            return jsonify({"error": "Kullanıcı bulunamadı"}), 404
        
        # Kullanıcının başarım ID'lerini al (hem string hem dict formatını destekle)
        user_achievements = user.get('achievements', [])
        user_achievement_ids = set()
        for a in user_achievements:
            if isinstance(a, dict):
                user_achievement_ids.add(a.get('id'))
            elif isinstance(a, str):
                user_achievement_ids.add(a)
        
        # Kullanıcı istatistiklerini al
        stats = user.get('statistics', {})
        
        return jsonify({
            "success": True,
            "achievements": list(user_achievement_ids),
            "stats": {
                "total_score": stats.get('total_score', 0),
                "games_played": stats.get('games_played', 0),
                "best_streak": stats.get('longest_streak', 0),
                "current_streak": stats.get('current_streak', 0),
                "consecutive_days": stats.get('consecutive_days', 0),
                "total_correct_answers": stats.get('total_correct_answers', 0),
            },
            "unlocked_count": len(user_achievement_ids),
            "total_count": len(ACHIEVEMENT_DEFINITIONS)
        })
        
    except Exception as e:
        print(f"❌ Başarımlar alınırken hata: {e}")
        return jsonify({"success": False, "error": f"Sunucu hatası: {str(e)}"}), 500
# --- SIDEBAR API ENDPOINTS ---

@game_bp.route('/word-statistics/<word_id>', methods=['GET'])
@token_required
def word_statistics(current_user_id, word_id):
    """
    Belirli bir kelimenin istatistiklerini döndürür.
    """
    try:
        db = current_app.db
        word_model = Word(db)
        word = word_model.get_word_by_id(word_id)
        if not word:
            return jsonify({"error": "Kelime bulunamadı"}), 404

        # O kelimeyle ilgili oyun geçmişi istatistikleri
        game_history = GameHistory(db)
        total_asked = db.games.count_documents({"questions.word_id": word_id})
        correct_answers = db.games.count_documents({"questions": {"$elemMatch": {"word_id": word_id, "result": True}}})
        wrong_answers = db.games.count_documents({"questions": {"$elemMatch": {"word_id": word_id, "result": False}}})
        correct_percentage = 0
        if total_asked > 0:
            correct_percentage = int(100 * correct_answers / total_asked)

        return jsonify({
            "word": word.get("kelime", ""),
            "category": word.get("kategori", ""),
            "difficulty": word.get("zorluk", ""),
            "total_asked": total_asked,
            "correct_answers": correct_answers,
            "wrong_answers": wrong_answers,
            "correct_percentage": correct_percentage
        })
    except Exception as e:
        print(f"❌ Kelime istatistikleri alınırken hata: {e}")
        return jsonify({"error": f"Sunucu hatası: {str(e)}"}), 500


@game_bp.route('/performance-analysis', methods=['GET'])
@token_required
def performance_analysis(current_user_id):
    """
    Kullanıcının genel performans analizini döndürür.
    """
    try:
        db = current_app.db
        user_model = User(db)
        user = user_model.find_by_id(current_user_id)
        stats = user.get("statistics", {}) if user else {}
        adaptive = user.get("adaptive_difficulty", {}) if user else {}

        user_success_rate = stats.get("success_rate", 0)
        category_average = 65  # TODO: Kategoriye göre ortalama hesaplanabilir
        average_response_time = stats.get("average_answer_time", 12.3)  # Varsayılan
        difficulty_multiplier = adaptive.get("current_modifier", 1.0)

        return jsonify({
            "user_success_rate": user_success_rate,
            "category_average": category_average,
            "average_response_time": average_response_time,
            "difficulty_multiplier": difficulty_multiplier
        })
    except Exception as e:
        print(f"❌ Performans analizi alınırken hata: {e}")
        return jsonify({"error": f"Sunucu hatası: {str(e)}"}), 500


@game_bp.route('/game-history', methods=['GET'])
@token_required
def game_history(current_user_id):
    """
    Kullanıcının son 10 oyununu ve soru detaylarını döndürür.
    """
    try:
        db = current_app.db
        gh_model = GameHistory(db)
        limit = int(request.args.get('limit', 10))
        games = list(db.games.find({"user_id": ObjectId(current_user_id), "completed": True}).sort("completed_at", -1).limit(limit))
        result = []
        for g in games:
            for q in g.get("questions", []):
                result.append({
                    "game_id": str(g["_id"]),
                    "word": q.get("kelime", ""),
                    "result": q.get("result", False),
                    "score": q.get("earned_points", 0),
                    "timestamp": q.get("timestamp", g.get("completed_at")),
                })
        return jsonify({"games": result[:limit]})
    except Exception as e:
        print(f"❌ Oyun geçmişi alınırken hata: {e}")
        return jsonify({"error": f"Sunucu hatası: {str(e)}"}), 500


@game_bp.route('/user-achievements', methods=['GET'])
@token_required
def user_achievements(current_user_id):
    """
    Kullanıcının başarımlarını döndürür.
    """
    try:
        db = current_app.db
        user_model = User(db)
        user = user_model.find_by_id(current_user_id)
        achievements = user.get("achievements", []) if user else []
        # Her bir başarıma progress ve hedef ekle (örnek)
        # Gerçek uygulamada backend'de başarımlar tablosu/modeli olmalı
        # Burada örnek olarak frontend ile uyumlu 3 başarımdan oluşan bir liste dönülüyor
        achievement_defs = [
            {"id": "STREAK_5", "name": "Ateşli Seri", "progress": user.get("statistics", {}).get("current_streak", 0), "target": 5, "icon": "🔥", "unlocked": any(a.get("id") == "STREAK_5" for a in achievements)},
            {"id": "SPEED_DEMON", "name": "Hız Canavarı", "progress": int(user.get("statistics", {}).get("average_answer_time", 99) < 15), "target": 1, "icon": "⚡", "unlocked": any(a.get("id") == "SPEED_DEMON" for a in achievements)},
            {"id": "WORD_MASTER", "name": "Kelime Ustası", "progress": user.get("statistics", {}).get("total_correct_answers", 0), "target": 50, "icon": "📚", "unlocked": any(a.get("id") == "WORD_MASTER" for a in achievements)},
        ]
        return jsonify({"achievements": achievement_defs})
    except Exception as e:
        print(f"❌ Başarımlar alınırken hata: {e}")
        return jsonify({"error": f"Sunucu hatası: {str(e)}"}), 500


@game_bp.route('/unlock-achievement', methods=['POST'])
@token_required
def unlock_achievement(current_user_id):
    """
    Body: { "achievement_ids": ["ID1","ID2"], "source": "game" }
    Adds achievements to the user's record if not already present.
    Returns the updated user achievements list.
    """
    try:
        data = request.get_json() or {}
        ids = data.get('achievement_ids') or []
        source = data.get('source', 'system')
        if not ids:
            return jsonify({"error": "achievement_ids gerekli"}), 400

        db = current_app.db
        user_model = User(db)
        added = user_model.add_achievements(current_user_id, ids, source=source)

        user = user_model.find_by_id(current_user_id)
        achievements = user.get('achievements', []) if user else []

        return jsonify({"added": ids if added else [], "achievements": achievements})
    except Exception as e:
        print(f"❌ Başarım ekleme hatası: {e}")
        return jsonify({"error": f"Sunucu hatası: {str(e)}"}), 500
@game_bp.route('/yeni-oyun', methods=['POST'])
@token_required
def yeni_oyun(current_user_id):
    """
    Body (opsiyonel):
    {
      "question_count": 5,
      "difficulty_mode": "adaptive" | "static",
      "categories": ["Bilim", "Nesneler"],
      "min_harf": 4,
      "max_harf": 10
    }
    """
    try:
        db = current_app.db
        active_game_model = ActiveGame(db)
        
        # Eğer kullanıcının zaten aktif bir oyunu varsa, sil
        active_game_model.delete_game(current_user_id)

        settings = get_game_settings(db)
        data = request.get_json() or {}

        question_count = int(data.get('question_count', 14))
        user_doc = db.users.find_one({"_id": ObjectId(current_user_id)}) if db is not None else None
        difficulty_mode = data.get('difficulty_mode') or (user_doc.get('preferences', {}).get('difficulty_preference') if user_doc else 'static')
        categories = data.get('categories', None)

        min_harf = int(data.get('min_harf', settings.get('min_harf', 4)))
        max_harf = int(data.get('max_harf', settings.get('max_harf', 10)))
        base_time_per_question = settings.get('base_time_per_question', 17)

        toplam_sure = base_time_per_question * question_count

        oyun_durumu = {
            'toplam_sure': toplam_sure,
            'kalan_sure': float(toplam_sure),
            'puan': 0,
            'mevcut_harf_sayisi': min_harf,
            'soru_sayaci': 1,
            'aktif_kelime': None,
            'aciklanan_harfler': [],
            'baslangic_zamani': None,
            'butona_basilma_zamani': None,
            'oyun_aktif': True,
            'toplam_sorular': question_count,
            'kullanici_id': current_user_id,
            'harf_maliyet': 0,
            'difficulty_mode': difficulty_mode,
            'categories': categories,
            'min_harf': min_harf,
            'max_harf': max_harf,
            'correct_count': 0,
            'wrong_count': 0,
            'current_streak': 0,
            'longest_streak': 0,
            'puan_delta': 0,
            'asked_questions': 0
        }

        # create game history record
        game_history_model = GameHistory(db)
        config = {
            "question_count": question_count,
            "difficulty_mode": difficulty_mode,
            "categories": categories,
            "min_harf": min_harf,
            "max_harf": max_harf,
            "base_time_per_question": base_time_per_question
        }
        gh_id = game_history_model.create_game_record(current_user_id, config)

        # Create active game record in the database
        active_game_model.create_game(current_user_id, oyun_durumu, gh_id)

        print(f"🎮 {current_user_id} için yeni oyun başlatıldı. Süre: {toplam_sure}s, Sorular: {question_count}")
        return jsonify(oyun_durumu)
    except Exception as e:
        print(f"❌ Yeni oyun başlatılırken hata: {e}")
        return jsonify({"error": f"Sunucu hatası: {str(e)}"}), 500

@game_bp.route('/sonraki-soru', methods=['POST'])
@token_required
def sonraki_soru(current_user_id):
    try:
        db = current_app.db
        active_game_model = ActiveGame(db)
        active_game = active_game_model.get_game(current_user_id)

        if not active_game:
            return jsonify({'error': 'Aktif oyun bulunamadı'}), 404

        oyun = active_game['game_state']
        settings = get_game_settings(db)

        if oyun.get('asked_questions', 0) >= oyun['toplam_sorular']:
            return oyun_sonu_isle(current_user_id, oyun, "tüm_sorular_tamamlandi")

        mevcut_harf_sayisi = oyun['mevcut_harf_sayisi']
        if oyun['soru_sayaci'] > 2 and oyun['min_harf'] and oyun['max_harf']:
            if mevcut_harf_sayisi < oyun['max_harf']:
                mevcut_harf_sayisi += 1
            oyun['soru_sayaci'] = 1

        word_model = Word(db)
        kullanilan_ids = active_game.get('used_words', [])

        kategori = None
        if oyun.get('categories'):
            kategori = random.choice(oyun['categories'])

        difficulty_modifier = 1.0
        if oyun.get('difficulty_mode') == 'adaptive':
            difficulty_modifier = calculate_difficulty_modifier(current_user_id, db)

        attempts = 0
        kelime_data = None
        while attempts < 10:
            kelime_data = word_model.get_random_word(difficulty=None, category=kategori, harf_sayisi=mevcut_harf_sayisi)
            if not kelime_data:
                kelime_data = word_model.get_random_word(difficulty=None, category=None, harf_sayisi=mevcut_harf_sayisi)
            if not kelime_data:
                attempts += 1
                if mevcut_harf_sayisi < oyun['max_harf']:
                    mevcut_harf_sayisi += 1
                else:
                    mevcut_harf_sayisi = oyun['min_harf']
                continue
            if str(kelime_data['_id']) in kullanilan_ids:
                total_same = word_model.collection.count_documents({"harf_sayisi": kelime_data.get('harf_sayisi'), "metadata.is_active": True})
                if len(kullanilan_ids) >= total_same and total_same > 0:
                    active_game_model.clear_used_words(current_user_id)
                    kullanilan_ids = []
                else:
                    attempts += 1
                    continue
            break

        if not kelime_data:
            return jsonify({'error': 'Bulunacak kelime kalmadı'}), 404

        kelime = temizle_ve_buyut(kelime_data['kelime'])
        active_game_model.add_used_word(current_user_id, str(kelime_data['_id']))

        oyun['aktif_kelime'] = kelime
        oyun['aciklanan_harfler'] = []
        oyun['baslangic_zamani'] = time.time()
        oyun['harf_maliyet'] = 0
        oyun['asked_questions'] = oyun.get('asked_questions', 0) + 1
        oyun['soru_sayaci'] = oyun.get('soru_sayaci', 1)
        oyun['mevcut_harf_sayisi'] = len(kelime)
        oyun['current_word_id'] = str(kelime_data['_id'])

        # Add checkpoint to game history and capture last index
        gh_id = active_game.get('game_history_id')
        last_index = None
        if gh_id:
            try:
                updated = db.games.find_one_and_update(
                    {"_id": ObjectId(gh_id)},
                    {"$push": {"questions": {
                        "word_id": str(kelime_data['_id']),
                        "kelime": kelime,
                        "revealed_letters": [],
                        "result": None,
                        "earned_points": None,
                        "timestamp": time.time(),
                        "kategori": kelime_data.get('kategori')
                    }}},
                    return_document=ReturnDocument.AFTER
                )
                if updated and 'questions' in updated:
                    last_index = len(updated['questions']) - 1
            except Exception as e:
                print(f"❌ Checkpoint eklenirken hata: {e}")

        active_game_model.update_game(current_user_id, {
            "game_state": oyun,
            "last_question_index": last_index
        })

        soru_bilgisi = f"{len(kelime)} HARFLİ {oyun['asked_questions']}. SORU"
        print(f"❓ {soru_bilgisi}: {kelime} (Dinamik Zorluk Çarpanı: {difficulty_modifier:.2f})")

        return jsonify({
            'kelime_id': str(kelime_data['_id']),
            'kelime_gosterim': kelime_gosterim_getir(kelime, []),
            'kalan_sure': oyun['kalan_sure'],
            'puan': oyun['puan'],
            'mevcut_harf_sayisi': len(kelime),
            'soru_sayaci': oyun['soru_sayaci'],
            'soru_bilgisi': soru_bilgisi,
            'aciklama': kelime_data.get('aciklama', f'{len(kelime)} harfli bir kelime tahmin edin.'),
            'ipuclari': kelime_data.get('ipuclari', [])
        })
    except Exception as e:
        print(f"❌ Sonraki soru getirilirken hata: {e}")
        return jsonify({"error": f"Sunucu hatası: {str(e)}"}), 500

@game_bp.route('/harf-satin-al', methods=['POST'])
@token_required
def harf_satin_al(current_user_id):
    try:
        db = current_app.db
        active_game_model = ActiveGame(db)
        active_game = active_game_model.get_game(current_user_id)

        if not active_game:
            return jsonify({'error': 'Aktif oyun bulunamadı'}), 404
        
        oyun = active_game['game_state']
        if not oyun.get('aktif_kelime'):
            return jsonify({'error': 'Aktif soru bulunamadı'}), 400

        kelime = oyun['aktif_kelime']
        aciklanan_harfler = oyun.get('aciklanan_harfler', [])
        aciklanmamis_harfler = [i for i in range(len(kelime)) if i not in aciklanan_harfler]
        if not aciklanmamis_harfler:
            return jsonify({'error': 'Açıkacak harf kalmadı'}), 400

        secilen_harf = random.choice(aciklanmamis_harfler)
        aciklanan_harfler.append(secilen_harf)
        oyun['aciklanan_harfler'] = aciklanan_harfler
        oyun['harf_maliyet'] = oyun.get('harf_maliyet', 0) + 100

        print(f"🔍 Harf açıklandı: {current_user_id}, Harf pozisyonu: {secilen_harf}")

        gh_id = active_game.get('game_history_id')
        last_idx = active_game.get('last_question_index')
        if gh_id is not None and last_idx is not None:
            try:
                field = f"questions.{last_idx}.revealed_letters"
                db.games.update_one({"_id": ObjectId(gh_id)}, {"$push": {field: secilen_harf}})
            except Exception as e:
                print(f"❌ Checkpoint revealed_letters update error: {e}")

        response_data = {
            'aciklanan_harf': kelime[secilen_harf],
            'aciklanan_pozisyon': secilen_harf,
            'kelime_gosterim': kelime_gosterim_getir(kelime, aciklanan_harfler),
            'aciklanan_harf_sayisi': len(aciklanan_harfler),
            'harf_maliyet': oyun.get('harf_maliyet', 0),
            'yeni_puan': oyun['puan']
        }

        if len(aciklanan_harfler) == len(kelime):
            soru_puani = (len(kelime) - len(aciklanan_harfler)) * 100
            harf_maliyet = oyun.get('harf_maliyet', 0)
            efektif_puan = max(soru_puani - harf_maliyet, 0)
            oyun['puan'] += efektif_puan
            oyun['puan_delta'] = oyun.get('puan_delta', 0) + efektif_puan
            oyun['correct_count'] = oyun.get('correct_count', 0) + 1
            oyun['current_streak'] = oyun.get('current_streak', 0) + 1
            if oyun['current_streak'] > oyun.get('longest_streak', 0):
                oyun['longest_streak'] = oyun['current_streak']

            if gh_id is not None and last_idx is not None:
                try:
                    db.games.update_one(
                        {"_id": ObjectId(gh_id)},
                        {"$set": {
                            f"questions.{last_idx}.result": True,
                            f"questions.{last_idx}.earned_points": efektif_puan
                        }}
                    )
                except Exception as e:
                    print(f"❌ Checkpoint finalize error: {e}")

            oyun['soru_sayaci'] = oyun.get('soru_sayaci', 1) + 1
            if oyun['soru_sayaci'] > 2 and oyun['mevcut_harf_sayisi'] < oyun['max_harf']:
                oyun['mevcut_harf_sayisi'] += 1
                oyun['soru_sayaci'] = 1

            oyun['butona_basilma_zamani'] = None
            oyun['baslangic_zamani'] = time.time()

            response_data['yeni_puan'] = oyun['puan']
            response_data['otomatik_dogru'] = True
            
            if oyun.get('asked_questions', 0) >= oyun['toplam_sorular']:
                 active_game_model.update_game(current_user_id, {"game_state": oyun})
                 return oyun_sonu_isle(current_user_id, oyun, "otomatik_dogru")

        active_game_model.update_game(current_user_id, {"game_state": oyun})
        return jsonify(response_data)
    except Exception as e:
        print(f"❌ Harf alırken hata: {e}")
        return jsonify({"error": f"Sunucu hatası: {str(e)}"}), 500

@game_bp.route('/butona-bas', methods=['POST'])
@token_required
def butona_bas(current_user_id):
    try:
        db = current_app.db
        active_game_model = ActiveGame(db)
        active_game = active_game_model.get_game(current_user_id)

        if not active_game:
            return jsonify({'error': 'Aktif oyun bulunamadı'}), 404
        
        oyun = active_game['game_state']
        if not oyun.get('aktif_kelime'):
            return jsonify({'error': 'Aktif soru bulunamadı'}), 400

        if oyun.get('baslangic_zamani'):
            gecen_sure = time.time() - oyun['baslangic_zamani']
            oyun['kalan_sure'] -= gecen_sure
            if oyun['kalan_sure'] < 0:
                oyun['kalan_sure'] = 0
            oyun['baslangic_zamani'] = None

        oyun['butona_basilma_zamani'] = time.time()
        
        active_game_model.update_game(current_user_id, {"game_state": oyun})

        return jsonify({
            'success': True,
            'kalan_cevap_suresi': 30,
            'kelime_gosterim': kelime_gosterim_getir(oyun['aktif_kelime'], oyun.get('aciklanan_harfler', [])),
            'aciklanan_harf_sayisi': len(oyun.get('aciklanan_harfler', [])),
            'kalan_sure': oyun['kalan_sure']
        })
    except Exception as e:
        print(f"❌ Butona basarken hata: {e}")
        return jsonify({"error": f"Sunucu hatası: {str(e)}"}), 500

# routes/game.py - SADECE PUANLAMA KISMI GÜNCELLENDİ
@game_bp.route('/tahmin-kontrol', methods=['POST'])
@token_required
def tahmin_kontrol(current_user_id):
    try:
        db = current_app.db
        active_game_model = ActiveGame(db)
        active_game = active_game_model.get_game(current_user_id)

        if not active_game:
            return jsonify({'error': 'Aktif oyun bulunamadı'}), 404

        oyun = active_game['game_state']
        data = request.get_json() or {}
        raw_tahmin = data.get('tahmin', '')

        tahmin = temizle_ve_buyut(raw_tahmin).replace(" ", "")
        kelime = oyun.get('aktif_kelime')
        if not kelime:
            return jsonify({'error': 'Aktif kelime bulunamadı'}), 400

        kelime_no_space = kelime.replace(" ", "")
        aciklanan = oyun.get('aciklanan_harfler', [])
        total_letters = len(kelime_no_space)
        revealed = len(aciklanan)
        
        kalan_harf_sayisi = max(total_letters - revealed, 0)
        kazanç = kalan_harf_sayisi * 100

        zaman_asimi = False
        if oyun.get('butona_basilma_zamani'):
            gecen_sure = time.time() - oyun['butona_basilma_zamani']
            if gecen_sure > 30:
                zaman_asimi = True

        gh_id = active_game.get('game_history_id')
        last_idx = active_game.get('last_question_index')

        # Uzunluk kontrolü ve yanlış tahmin
        if len(tahmin) != total_letters and not zaman_asimi:
            ceza = total_letters * 100
            oyun['puan'] = max(oyun['puan'] - ceza, 0)
            oyun['puan_delta'] = oyun.get('puan_delta', 0) - ceza
            oyun['wrong_count'] = oyun.get('wrong_count', 0) + 1
            oyun['current_streak'] = 0
            mesaj = f"❌ Tahmin uzunluğu kelime uzunluğuyla eşleşmiyor. -{ceza} puan"

            if gh_id is not None and last_idx is not None:
                try:
                    db.games.update_one(
                        {"_id": ObjectId(gh_id)}, 
                        {"$set": {f"questions.{last_idx}.result": False, f"questions.{last_idx}.earned_points": -ceza}}
                    )
                except Exception as e:
                    print(f"❌ Checkpoint wrong update error: {e}")
            
            oyun['soru_sayaci'] = oyun.get('soru_sayaci', 1) + 1
            if oyun['soru_sayaci'] > 2 and oyun['mevcut_harf_sayisi'] < oyun['max_harf']:
                oyun['mevcut_harf_sayisi'] += 1
                oyun['soru_sayaci'] = 1
            oyun['butona_basilma_zamani'] = None
            oyun['baslangic_zamani'] = time.time()
            oyun['harf_maliyet'] = 0

            active_game_model.update_game(current_user_id, {"game_state": oyun})
            return jsonify({
                'dogru': False, 'yeni_puan': oyun['puan'], 'mesaj': mesaj, 'dogru_kelime': kelime_no_space,
                'sizin_tahmininiz': tahmin, 'zaman_asimi': zaman_asimi, 'efektif_puan': -ceza,
                'yeni_harf_sayisi': oyun['mevcut_harf_sayisi'], 'yeni_soru_sayaci': oyun['soru_sayaci'],
                'sonraki_soru_gerekli': True
            })

        dogru_cevap = (tahmin == kelime_no_space) and not zaman_asimi and tahmin != ""

        if dogru_cevap:
            oyun['puan'] += kazanç
            oyun['puan_delta'] = oyun.get('puan_delta', 0) + kazanç
            oyun['correct_count'] = oyun.get('correct_count', 0) + 1
            oyun['current_streak'] = oyun.get('current_streak', 0) + 1
            if oyun['current_streak'] > oyun.get('longest_streak', 0):
                oyun['longest_streak'] = oyun['current_streak']
            mesaj = f"✅ DOĞRU! +{kazanç} puan"
            if gh_id is not None and last_idx is not None:
                db.games.update_one({"_id": ObjectId(gh_id)}, {"$set": {f"questions.{last_idx}.result": True, f"questions.{last_idx}.earned_points": kazanç}})
        else:
            ceza = total_letters * 100
            oyun['puan'] = max(oyun['puan'] - ceza, 0)
            oyun['puan_delta'] = oyun.get('puan_delta', 0) - ceza
            oyun['wrong_count'] = oyun.get('wrong_count', 0) + 1
            oyun['current_streak'] = 0
            mesaj = f"⏰ SÜRE DOLDU! -{ceza} puan" if zaman_asimi else f"❌ YANLIŞ! -{ceza} puan"
            if gh_id is not None and last_idx is not None:
                db.games.update_one({"_id": ObjectId(gh_id)}, {"$set": {f"questions.{last_idx}.result": False, f"questions.{last_idx}.earned_points": -ceza}})

        oyun['soru_sayaci'] = oyun.get('soru_sayaci', 1) + 1
        if oyun['soru_sayaci'] > 2 and oyun['mevcut_harf_sayisi'] < oyun['max_harf']:
            oyun['mevcut_harf_sayisi'] += 1
            oyun['soru_sayaci'] = 1

        oyun['butona_basilma_zamani'] = None
        oyun['baslangic_zamani'] = time.time()
        oyun['harf_maliyet'] = 0

        if oyun.get('asked_questions', 0) >= oyun['toplam_sorular']:
            active_game_model.update_game(current_user_id, {"game_state": oyun})
            return oyun_sonu_isle(current_user_id, oyun, "tüm_sorular_tamamlandi")

        active_game_model.update_game(current_user_id, {"game_state": oyun})
        return jsonify({
            'dogru': dogru_cevap, 'yeni_puan': oyun['puan'], 'mesaj': mesaj,
            'dogru_kelime': kelime_no_space, 'sizin_tahmininiz': tahmin if tahmin else "SÜRE DOLDU",
            'zaman_asimi': zaman_asimi, 'efektif_puan': kazanç if dogru_cevap else -ceza,
            'yeni_harf_sayisi': oyun['mevcut_harf_sayisi'], 'yeni_soru_sayaci': oyun['soru_sayaci'],
            'sonraki_soru_gerekli': True
        })
    except Exception as e:
        print(f"❌ Tahmin kontrol edilirken hata: {e}")
        return jsonify({"error": f"Sunucu hatası: {str(e)}"}), 500

@game_bp.route('/oyunu-bitir', methods=['POST'])
@token_required
def oyunu_bitir(current_user_id):
    try:
        db = current_app.db
        active_game_model = ActiveGame(db)
        active_game = active_game_model.get_game(current_user_id)

        if not active_game:
            return jsonify({'error': 'Aktif oyun bulunamadı'}), 404

        oyun = active_game['game_state']
        return oyun_sonu_isle(current_user_id, oyun, "kullanici_bitirdi")
    except Exception as e:
        print(f"❌ Oyunu bitirirken hata: {e}")
        return jsonify({"error": f"Sunucu hatası: {str(e)}"}), 500

@game_bp.route('/recent-games', methods=['GET'])
@token_required
def recent_games(current_user_id):
    try:
        db = current_app.db
        limit = int(request.args.get('limit', 20))

        games = get_recent_finishers(db, limit=limit)

        return jsonify({
            "success": True,
            "games": games
        })
    except Exception as e:
        print(f"❌ Recent games alınırken hata: {e}")
        return jsonify({
            "success": False,
            "error": "Sunucu hatası"
        }), 500







