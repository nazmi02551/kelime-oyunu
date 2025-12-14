# models/user.py - GÜNCELLENMİŞ
from bson.objectid import ObjectId
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import math

class User:
    def __init__(self, db):
        self.collection = db.users

    def create_user(self, username, email, password, profile_data=None, preferences=None, is_admin=False):
        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
        user = {
            "username": username,
            "email": email,
            "password": hashed_password,
            "profile": profile_data or {},
            "preferences": preferences or {
                "theme": "dark",
                "sound_enabled": True,
                "difficulty_preference": "static",
                "categories": []
            },
            "statistics": {
                "total_score": 0,
                "games_played": 0,
                "total_correct_answers": 0,
                "total_wrong_answers": 0,
                "average_score_per_game": 0,
                "longest_streak": 0,
                "current_streak": 0,
                "total_questions_answered": 0,
                "success_rate": 0.0
            },
            "adaptive_difficulty": {
                "current_modifier": 1.0,
                "performance_score": 0.5,
                "last_updated": None
            },
            "achievements": [],
            "is_admin": bool(is_admin),
            "metadata": {
                "created_at": datetime.utcnow(),
                "last_login_at": None,
                "last_game_at": None
            }
        }
        return self.collection.insert_one(user)

    def find_by_email(self, email):
        return self.collection.find_one({"email": email})

    def find_by_id(self, user_id):
        try:
            return self.collection.find_one({"_id": ObjectId(user_id)})
        except Exception:
            return None

    def check_password(self, stored_password, provided_password):
        return check_password_hash(stored_password, provided_password)

    # YENİ: Atomic stat updates with better error handling
    def increment_stats(self, user_id, inc_fields=None, set_fields=None):
        inc_fields = inc_fields or {}
        set_fields = set_fields or {}
        update = {}
        if inc_fields:
            update["$inc"] = inc_fields
        if set_fields:
            update["$set"] = set_fields
        if not update:
            return None
        
        try:
            result = self.collection.update_one({"_id": ObjectId(user_id)}, update)
            return result.modified_count > 0
        except Exception as e:
            print(f"❌ Kullanıcı istatistik güncelleme hatası: {e}")
            return False

    # YENİ: Geliştirilmiş oyun sonrası güncelleme
    def update_after_game(self, user_id, final_score, correct_answers, wrong_answers, game_score, current_streak=0, longest_streak=0):
        """
        Oyun sonrası tüm istatistikleri atomic olarak günceller
        """
        try:
            user = self.find_by_id(user_id)
            if not user:
                print(f"❌ Kullanıcı bulunamadı: {user_id}")
                return False

            stats = user.get("statistics", {})
            games_played = stats.get("games_played", 0) + 1
            total_score = stats.get("total_score", 0) + game_score
            total_correct = stats.get("total_correct_answers", 0) + correct_answers
            total_wrong = stats.get("total_wrong_answers", 0) + wrong_answers
            total_questions = total_correct + total_wrong
            
            # Başarı oranı
            success_rate = (total_correct / total_questions) * 100 if total_questions > 0 else 0.0
            
            # Ortalama skor
            average_score = total_score / games_played if games_played > 0 else 0

            # Seri güncellemeleri
            current_streak = max(current_streak, 0)  # Negatif olmamalı
            longest_streak = max(stats.get('longest_streak', 0), current_streak, longest_streak)

            update_data = {
                "$set": {
                    "statistics.total_score": total_score,
                    "statistics.games_played": games_played,
                    "statistics.average_score_per_game": round(average_score, 2),
                    "statistics.current_streak": current_streak,
                    "statistics.longest_streak": longest_streak,
                    "statistics.total_questions_answered": total_questions,
                    "statistics.success_rate": round(success_rate, 2),
                    "metadata.last_game_at": datetime.utcnow()
                },
                "$inc": {
                    "statistics.total_correct_answers": correct_answers,
                    "statistics.total_wrong_answers": wrong_answers
                }
            }

            result = self.collection.update_one({"_id": ObjectId(user_id)}, update_data)
            
            if result.modified_count > 0:
                print(f"✅ Kullanıcı istatistikleri güncellendi: {user_id}")
                return True
            else:
                print(f"⚠️ Kullanıcı istatistikleri güncellenmedi: {user_id}")
                return False
                
        except Exception as e:
            print(f"❌ Oyun sonrası güncelleme hatası: {e}")
            return False

    # YENİ: Basitleştirilmiş puan ekleme
    def add_score(self, user_id, score_delta, correct_count=0, wrong_count=0):
        """
        Basit puan ekleme - eski karmaşık yapı yerine
        """
        try:
            update_data = {
                "$inc": {
                    "statistics.total_score": score_delta,
                    "statistics.total_correct_answers": correct_count,
                    "statistics.total_wrong_answers": wrong_count
                }
            }
            
            result = self.collection.update_one({"_id": ObjectId(user_id)}, update_data)
            return result.modified_count > 0
        except Exception as e:
            print(f"❌ Puan ekleme hatası: {e}")
            return False

    def set_last_login(self, user_id):
        try:
            result = self.collection.update_one(
                {"_id": ObjectId(user_id)}, 
                {"$set": {"metadata.last_login_at": datetime.utcnow()}}
            )
            return result.modified_count > 0
        except Exception as e:
            print(f"❌ Son giriş güncelleme hatası: {e}")
            return False

    def is_admin(self, user_id):
        user = self.find_by_id(user_id)
        return bool(user and user.get("is_admin", False))

    def set_admin(self, user_id, is_admin=True):
        try:
            result = self.collection.update_one(
                {"_id": ObjectId(user_id)}, 
                {"$set": {"is_admin": bool(is_admin)}}
            )
            return result.modified_count > 0
        except Exception as e:
            print(f"❌ Admin ayarı hatası: {e}")
            return False

    # YENİ: Kullanıcı istatistiklerini getirme
    def get_user_stats(self, user_id):
        """
        Kullanıcının güncel istatistiklerini getirir
        """
        try:
            user = self.find_by_id(user_id)
            if user:
                return user.get('statistics', {})
            return {}
        except Exception as e:
            print(f"❌ İstatistik getirme hatası: {e}")
            return {}

    # YENİ: Adaptive difficulty güncelleme
    def update_adaptive_difficulty(self, user_id, performance_score, current_modifier=None):
        """
        Kullanıcının zorluk seviyesini günceller
        """
        try:
            update_data = {
                "$set": {
                    "adaptive_difficulty.performance_score": max(0.1, min(1.0, performance_score)),
                    "adaptive_difficulty.last_updated": datetime.utcnow()
                }
            }
            
            if current_modifier:
                update_data["$set"]["adaptive_difficulty.current_modifier"] = max(0.5, min(2.0, current_modifier))
            
            result = self.collection.update_one({"_id": ObjectId(user_id)}, update_data)
            return result.modified_count > 0
        except Exception as e:
            print(f"❌ Zorluk güncelleme hatası: {e}")
            return False

    # YENİ: Başarımları ekle (salt okunur olmayan, yalnızca yeni başarımları ekler)
    def add_achievements(self, user_id, achievement_ids, source='system'):
        """
        achievement_ids: list of achievement id strings
        Appends achievement objects to user's achievements array if not present.
        Each stored achievement: { id: str, unlocked_at: datetime, source: str }
        Returns True if the document was modified.
        """
        if not achievement_ids:
            return False
        try:
            now = datetime.utcnow()
            to_add = []
            for aid in achievement_ids:
                to_add.append({"id": aid, "unlocked_at": now, "source": source})

            result = self.collection.update_one(
                {"_id": ObjectId(user_id)},
                {"$addToSet": {"achievements": {"$each": to_add}}}
            )
            return result.modified_count > 0
        except Exception as e:
            print(f"❌ Başarımlar eklenirken hata: {e}")
            return False