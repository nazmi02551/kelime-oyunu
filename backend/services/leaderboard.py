# services/leaderboard.py
# Liderlik tablosu / istatistik servisleri
from datetime import datetime, timedelta
from bson.son import SON
from bson.objectid import ObjectId


def get_period_range(period: str):
    """
    İstenen dönem için (start, end) UTC tarih aralığını döner.
    period: 'daily', 'weekly', 'monthly', 'all'
    """
    now = datetime.utcnow()

    if period == "daily":
        start = datetime(now.year, now.month, now.day)
        end = start + timedelta(days=1)
    elif period == "weekly":
        # Pazartesi başlangıç kabul edelim
        start = datetime(now.year, now.month, now.day) - timedelta(days=now.weekday())
        end = start + timedelta(days=7)
    elif period == "monthly":
        start = datetime(now.year, now.month, 1)
        if now.month == 12:
            end = datetime(now.year + 1, 1, 1)
        else:
            end = datetime(now.year, now.month + 1, 1)
    else:
        # 'all' veya bilinmeyen
        start = None
        end = None

    return start, end


def _build_base_match(period: str = "all", kategori: str | None = None):
    """
    Tüm leaderboard sorguları için ortak match filtresi.
    NOT: Eski sürümdeki 'completed: True' filtresi yüzünden hiçbir kayıt gelmiyordu.
         Artık sadece final_score dolu oyunları baz alıyoruz.
    """
    match = {
        "final_score": {"$ne": None}
    }

    start, end = get_period_range(period)
    if start and end:
        match["end_time"] = {"$gte": start, "$lt": end}

    # Kategori filtresi: sorulardan herhangi birinin kategorisi eşleşiyorsa yeterli
    if kategori:
        match["questions.kategori"] = kategori

    return match


def aggregate_leaderboard(db, period: str = "all", kategori: str | None = None, limit: int = 50):
    """
    Ana liderlik tablosu.
    Kullanıcı bazlı:
      - total_score
      - games_played
      - average_score
      - total_correct_answers (sorulardan hesaplanır)
      - total_questions
      - last_game_time
      - username (users koleksiyonundan çekilir)
    """
    games_col = db.games

    match_stage = {"$match": _build_base_match(period, kategori)}

    # Her oyun için doğru soru sayısı ve toplam soru sayısı hesapla
    add_fields_stage = {
        "$addFields": {
            "correct_in_game": {
                "$size": {
                    "$filter": {
                        "input": {"$ifNull": ["$questions", []]},
                        "as": "q",
                        "cond": {"$eq": ["$$q.result", True]},
                    }
                }
            },
            "total_questions_in_game": {
                "$size": {"$ifNull": ["$questions", []]}
            },
            "user_id_str": {"$toString": "$user_id"},
        }
    }

    # user_id'yi stringe çevirip gruplayarak
    # hem ObjectId hem string stored user_id'leri tek kullanıcıda topluyoruz
    group_stage = {
        "$group": {
            "_id": "$user_id_str",  # string halindeki user_id
            "any_user_id": {"$first": "$user_id"},  # orijinal type
            "total_score": {"$sum": "$final_score"},
            "games_played": {"$sum": 1},
            "average_score": {"$avg": "$final_score"},
            "total_correct_answers": {"$sum": "$correct_in_game"},
            "total_questions": {"$sum": "$total_questions_in_game"},
            "last_game_time": {"$max": "$end_time"},
        }
    }

    sort_stage = {
        "$sort": SON([("total_score", -1), ("games_played", -1)])
    }

    limit_stage = {"$limit": int(limit)}

    # Kullanıcı adını users koleksiyonundan çek
    lookup_stage = {
        "$lookup": {
            "from": "users",
            "let": {"uid_str": "$_id"},
            "pipeline": [
                {"$addFields": {"_id_str": {"$toString": "$_id"}}},
                {"$match": {"$expr": {"$eq": ["$_id_str", "$$uid_str"]}}},
                {"$project": {"_id": 1, "username": 1}},
            ],
            "as": "user",
        }
    }

    project_stage = {
        "$project": {
            "_id": 0,
            "user_id": "$_id",  # string
            "username": {
                "$ifNull": [{"$arrayElemAt": ["$user.username", 0]}, None]
            },
            "total_score": 1,
            "games_played": 1,
            "average_score": {
                "$ifNull": ["$average_score", 0]
            },
            "total_correct_answers": 1,
            "total_questions": 1,
            "last_game_time": 1,
        }
    }

    pipeline = [
        match_stage,
        add_fields_stage,
        group_stage,
        sort_stage,
        limit_stage,
        lookup_stage,
        project_stage,
    ]

    docs = list(games_col.aggregate(pipeline))

    # Datetime alanlarını JSON'a uygun hale getir
    for d in docs:
        lgt = d.get("last_game_time")
        if isinstance(lgt, datetime):
            d["last_game_time"] = lgt.isoformat()

    return docs


def get_recent_finishers(db, limit=20, days=7):
    """
    Son 'days' gün içinde biten ve final_score > 0 olan oyunları getirir.
    Frontend'in beklediği JSON'a uygun hale getirir.
    """
    now = datetime.utcnow()
    since = now - timedelta(days=days)

    pipeline = [
        {
            "$match": {
                "end_time": {"$gte": since},
                "final_score": {"$gt": 0}
            }
        },
        {"$sort": {"end_time": -1}},
        {"$limit": limit},
        {
            "$lookup": {
                "from": "users",
                "localField": "user_id",
                "foreignField": "_id",
                "as": "user"
            }
        },
        {"$unwind": {"path": "$user", "preserveNullAndEmptyArrays": True}},
        {
            "$project": {
                "_id": 1,
                "user_id": 1,
                "final_score": 1,
                "end_time": 1,
                "questions": 1,
                "username": {"$ifNull": ["$user.username", "Anonim Oyuncu"]}
            }
        }
    ]

    docs = list(db.games.aggregate(pipeline))
    results = []

    for d in docs:
        questions = d.get("questions") or []
        correct = sum(1 for q in questions if q.get("result") is True)
        total_q = len(questions)

        results.append({
            "id": str(d.get("_id")),
            "user_id": str(d.get("user_id")),
            "username": d.get("username") or "Anonim Oyuncu",
            "final_score": int(d.get("final_score") or 0),
            "end_time": d.get("end_time").isoformat() if d.get("end_time") else None,
            "correct_answers": int(correct),
            "total_questions": int(total_q),
        })

    return results


def get_top_players_by_best_score(db, limit: int = 5, period: str = "all", kategori: str | None = None):
    """
    En yüksek skor alınan oyunları (oyun bazında) döner.
    """
    games_col = db.games

    match_stage = {"$match": _build_base_match(period, kategori)}

    add_fields_stage = {
        "$addFields": {
            "correct_in_game": {
                "$size": {
                    "$filter": {
                        "input": {"$ifNull": ["$questions", []]},
                        "as": "q",
                        "cond": {"$eq": ["$$q.result", True]},
                    }
                }
            },
            "total_questions_in_game": {
                "$size": {"$ifNull": ["$questions", []]}
            },
            "user_id_str": {"$toString": "$user_id"},
        }
    }

    sort_stage = {
        "$sort": SON([("final_score", -1), ("end_time", -1)])
    }

    limit_stage = {"$limit": int(limit)}

    lookup_stage = {
        "$lookup": {
            "from": "users",
            "let": {"uid_str": "$user_id_str"},
            "pipeline": [
                {"$addFields": {"_id_str": {"$toString": "$_id"}}},
                {"$match": {"$expr": {"$eq": ["$_id_str", "$$uid_str"]}}},
                {"$project": {"_id": 1, "username": 1}},
            ],
            "as": "user",
        }
    }

    project_stage = {
        "$project": {
            "_id": 0,
            "user_id": "$user_id_str",
            "username": {
                "$ifNull": [{"$arrayElemAt": ["$user.username", 0]}, None]
            },
            "best_score": "$final_score",
            "correct_answers": "$correct_in_game",
            "total_questions": "$total_questions_in_game",
            "completed_at": "$end_time",
        }
    }

    pipeline = [
        match_stage,
        add_fields_stage,
        sort_stage,
        limit_stage,
        lookup_stage,
        project_stage,
    ]

    docs = list(games_col.aggregate(pipeline))

    for d in docs:
        ct = d.get("completed_at")
        if isinstance(ct, datetime):
            d["completed_at"] = ct.isoformat()

    return docs


def get_leaderboard_stats(db, period: str = "all", kategori: str | None = None):
    """
    Genel istatistikler:
      - total_games
      - total_players
      - total_score
      - average_score (ve avg_score alias'ı)
    """
    games_col = db.games

    match = _build_base_match(period, kategori)
    docs = list(games_col.find(match, {"user_id": 1, "final_score": 1}))

    total_games = len(docs)
    total_score = sum(d.get("final_score") or 0 for d in docs)
    unique_users = {str(d.get("user_id")) for d in docs if d.get("user_id") is not None}
    total_players = len(unique_users)
    average_score = float(total_score) / total_games if total_games > 0 else 0.0

    return {
        "total_games": total_games,
        "total_players": total_players,
        "total_score": total_score,
        "average_score": average_score,
        # Bazı yerlerde avg_score bekleniyor olabilir, alias olarak ekledim
        "avg_score": average_score,
    }
