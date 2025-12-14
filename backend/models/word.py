# models/word.py
import random
from bson.objectid import ObjectId

class Word:
    def __init__(self, db):
        self.collection = db.words

    def _base_query(self, difficulty=None, category=None):
        q = {"metadata.is_active": True}
        if difficulty:
            q["zorluk"] = difficulty
        if category:
            q["kategori"] = category
        return q

    def get_random_word(self, difficulty=None, category=None, harf_sayisi=None):
        """
        Esnek kelime seçimi:
        1) Eğer harf_sayisi verilmişse önce tam eşleşme dene.
        2) Yoksa veya sonuç yoksa aynı filtrelerle distinct harf_sayisi al ve en yakın değeri dene.
        3) Hala yoksa kategori/zorluk filtrelerini kaldırıp tüm aktif kelimelerden rastgele seç.
        """
        base_query = self._base_query(difficulty, category)

        if harf_sayisi:
            q = dict(base_query)
            q["harf_sayisi"] = harf_sayisi
            pipeline = [{"$match": q}, {"$sample": {"size": 1}}]
            res = list(self.collection.aggregate(pipeline))
            if res:
                return res[0]

            # distinct harf_sayisi değerleri (aynı kategori/zorluk içinde)
            distinct_vals = self.collection.distinct("harf_sayisi", base_query)
            if distinct_vals:
                # en yakın değeri bul
                closest = min(distinct_vals, key=lambda x: abs(x - harf_sayisi))
                q2 = dict(base_query)
                q2["harf_sayisi"] = closest
                pipeline = [{"$match": q2}, {"$sample": {"size": 1}}]
                res = list(self.collection.aggregate(pipeline))
                if res:
                    return res[0]

            # fallback: tüm aktif kelimelerden rastgele
            pipeline = [{"$match": {"metadata.is_active": True}}, {"$sample": {"size": 1}}]
            res = list(self.collection.aggregate(pipeline))
            return res[0] if res else None

        else:
            # harf_sayisi verilmemişse kategori/zorluk ile rastgele seç
            pipeline = [{"$match": base_query}, {"$sample": {"size": 1}}]
            res = list(self.collection.aggregate(pipeline))
            if res:
                return res[0]
            pipeline = [{"$match": {"metadata.is_active": True}}, {"$sample": {"size": 1}}]
            res = list(self.collection.aggregate(pipeline))
            return res[0] if res else None

    def get_word_by_id(self, word_id):
        try:
            return self.collection.find_one({"_id": ObjectId(word_id)})
        except Exception:
            return None
