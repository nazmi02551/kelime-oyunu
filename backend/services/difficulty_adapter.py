# services/difficulty_adapter.py
from models.user import User

def calculate_difficulty_modifier(user_id, db):
    """
    Kullanıcının profili ve istatistiklerine göre bir zorluk çarpanı hesaplar.
    Gelişmiş bir algoritma, makine öğrenmesi modelleri ile değiştirilebilir.
    """
    modifier = 1.0
    user_model = User(db)
    user = user_model.find_by_id(user_id)
    
    if not user:
        return 1.0  # Varsayılan

    profile = user.get('profile', {})
    stats = user.get('statistics', {})

    # 1. Eğitim Seviyesine Göre Ayar
    education_map = {
        "lise": 0.9,
        "lisans": 1.0,
        "yüksek_lisans": 1.05,
        "doktora": 1.1
    }
    modifier *= education_map.get(profile.get('education_level'), 1.0)

    # 2. Yaş Grubuna Göre Ayar
    age_map = {
        "18-24": 0.95,
        "25-34": 1.0,
        "35-44": 1.0,
        "45+": 1.05
    }
    modifier *= age_map.get(profile.get('age_group'), 1.0)

    # 3. Performansa Göre Dinamik Ayar
    if stats.get('games_played', 0) > 3:
        total_correct = stats.get('total_correct_answers', 0)
        total_wrong = stats.get('total_wrong_answers', 0)
        denom = total_correct + total_wrong
        success_rate = (total_correct / denom) if denom > 0 else 0.0

        if success_rate < 0.75:
            modifier *= 0.9
        elif success_rate > 0.95:
            modifier *= 1.1

    return modifier
