from bson.objectid import ObjectId
from datetime import datetime

class GameHistory:
    def __init__(self, db):
        # Tüm oyun geçmişi kayıtları tek koleksiyonda tutuluyor
        self.collection = db.games

    def _to_object_id(self, value):
        """Gelen değeri mümkünse ObjectId'e çevir, değilse olduğu gibi bırak."""
        try:
            return ObjectId(value)
        except Exception:
            return value

    def create_game_record(self, user_id, config, start_time=None):
        """
        Yeni bir oyun kaydı oluşturur.
        - user_id: string veya ObjectId
        - config: oyun başlangıç ayarları (soru sayısı, zorluk modu, kategoriler vb.)
        """
        user_oid = self._to_object_id(user_id)

        doc = {
            "user_id": user_oid,
            "config": config,
            "start_time": start_time or datetime.utcnow(),
            "end_time": None,
            "final_score": 0,
            "questions": [],  # {word_id, kelime, revealed_letters, result, earned_points, timestamp, kategori}
            # Leaderboard ve istatistikler için gereken alanlar
            "completed": False,
            "completed_at": None,
            "correct_answers": 0,
            "total_questions": (config or {}).get("question_count"),
            "game_duration": None,
            "category": None,
            "metadata": {
                "created_at": datetime.utcnow()
            }
        }
        res = self.collection.insert_one(doc)
        return str(res.inserted_id)

    def add_question_checkpoint(self, game_id, question_data):
        """
        Soruları oyun boyunca parça parça ekler.
        question_data:
          {
            word_id, kelime, revealed_letters, result,
            earned_points, timestamp, kategori
          }
        """
        return self.collection.update_one(
            {"_id": ObjectId(game_id)},
            {"$push": {"questions": question_data}}
        )

    def finalize_game(self, game_id, final_score, correct_answers=0,
                      total_questions=None, duration=None, categories=None,
                      end_time=None):
        """
        Oyun bittiğinde çağrılır.
        Leaderboard tarafının beklediği alanlar burada set edilir:
        - completed, completed_at
        - final_score
        - correct_answers, total_questions
        - game_duration
        - category (tek kategori varsa o, birden fazlaysa "mixed")
        """
        end_time = end_time or datetime.utcnow()

        update = {
            "final_score": final_score,
            "end_time": end_time,
            "completed": True,
            "completed_at": end_time,
            "correct_answers": int(correct_answers or 0),
        }

        if total_questions is not None:
            update["total_questions"] = int(total_questions)

        if duration is not None:
            # saniye cinsinden tutulabilir
            update["game_duration"] = float(duration)

        if categories:
            if isinstance(categories, (list, tuple)):
                update["category"] = categories[0] if len(categories) == 1 else "mixed"
            else:
                update["category"] = categories

        return self.collection.update_one(
            {"_id": ObjectId(game_id)},
            {"$set": update}
        )
