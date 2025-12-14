# models/daily_task.py
from bson.objectid import ObjectId
from datetime import datetime, timedelta

class DailyTask:
    """
    Günlük görev sistemi.
    Her gün yeni görevler oluşturulur ve kullanıcılar tamamladıkça ödül kazanır.
    Görev tanımları admin panelinden yönetilebilir.
    """
    
    # Varsayılan görev tanımları (DB'de yoksa kullanılır)
    DEFAULT_TASK_DEFINITIONS = {
        'play_1_game': {
            'id': 'play_1_game',
            'name': 'Günlük Oyun',
            'description': '1 oyun oyna',
            'icon': '🎮',
            'task_type': 'games_played',
            'target': 1,
            'reward_points': 50,
            'active': True
        },
        'play_3_games': {
            'id': 'play_3_games',
            'name': 'Üçleme',
            'description': '3 oyun oyna',
            'icon': '🎯',
            'task_type': 'games_played',
            'target': 3,
            'reward_points': 100,
            'active': True
        },
        'win_5_correct': {
            'id': 'win_5_correct',
            'name': 'Doğru Cevapçı',
            'description': '5 doğru cevap ver',
            'icon': '✅',
            'task_type': 'correct_answers',
            'target': 5,
            'reward_points': 75,
            'active': True
        },
        'earn_500_points': {
            'id': 'earn_500_points',
            'name': 'Puan Avcısı',
            'description': '500 puan kazan',
            'icon': '💰',
            'task_type': 'score_earned',
            'target': 500,
            'reward_points': 150,
            'active': True
        },
        'streak_3': {
            'id': 'streak_3',
            'name': 'Seri Başlangıcı',
            'description': '3 doğru seri yap',
            'icon': '🔥',
            'task_type': 'best_streak',
            'target': 3,
            'reward_points': 100,
            'active': True
        }
    }
    
    def __init__(self, db):
        self.db = db
        self.collection = db.daily_tasks
        self.users = db.users
        self.task_definitions_collection = db.daily_task_definitions
    
    def get_task_definitions(self):
        """Admin'den tanımlanan görevleri getirir, yoksa varsayılanları kullanır."""
        definitions = list(self.task_definitions_collection.find({'active': True}))
        
        if not definitions:
            # DB'de tanım yoksa varsayılanları kullan
            return self.DEFAULT_TASK_DEFINITIONS
        
        # Liste formatından dict formatına dönüştür
        return {d['id']: d for d in definitions}
    
    def get_today_date(self):
        """Bugünün tarihini YYYY-MM-DD formatında döndürür."""
        return datetime.utcnow().strftime('%Y-%m-%d')
    
    def get_user_daily_tasks(self, user_id):
        """
        Kullanıcının bugünkü görevlerini getirir.
        Eğer yoksa oluşturur.
        """
        today = self.get_today_date()
        
        # Bugünkü kaydı bul
        record = self.collection.find_one({
            'user_id': ObjectId(user_id),
            'date': today
        })
        
        if not record:
            # Yeni günlük kayıt oluştur
            record = self._create_daily_record(user_id, today)
        
        return record
    
    def _create_daily_record(self, user_id, date):
        """Yeni günlük görev kaydı oluşturur."""
        import random
        
        # Admin'den tanımlanan görevleri al
        task_definitions = self.get_task_definitions()
        task_ids = list(task_definitions.keys())
        
        # Her gün için 3 rastgele görev seç
        selected_tasks = random.sample(task_ids, min(3, len(task_ids)))
        
        tasks = []
        for task_id in selected_tasks:
            task_def = task_definitions[task_id]
            tasks.append({
                'task_id': task_id,
                'name': task_def.get('name', ''),
                'description': task_def.get('description', ''),
                'icon': task_def.get('icon', '📋'),
                'target': task_def.get('target', 1),
                'progress': 0,
                'completed': False,
                'reward_claimed': False,
                'reward_type': 'score',
                'reward_amount': task_def.get('reward_points', 100)
            })
        
        record = {
            'user_id': ObjectId(user_id),
            'date': date,
            'tasks': tasks,
            'daily_stats': {
                'games_played': 0,
                'correct_answers': 0,
                'wrong_answers': 0,
                'score_earned': 0,
                'best_streak': 0
            },
            'created_at': datetime.utcnow()
        }
        
        self.collection.insert_one(record)
        return record
    
    def update_progress(self, user_id, field, value, increment=True):
        """
        Kullanıcının günlük ilerlemesini günceller.
        field: 'games_played', 'correct_answers', 'score_earned', 'best_streak'
        """
        today = self.get_today_date()
        
        # Önce kaydı al veya oluştur
        record = self.get_user_daily_tasks(user_id)
        
        # Daily stats güncelle
        update_op = {"$inc": {f"daily_stats.{field}": value}} if increment else {"$set": {f"daily_stats.{field}": value}}
        
        if field == 'best_streak' and not increment:
            # best_streak için max değeri al
            current_best = record.get('daily_stats', {}).get('best_streak', 0)
            if value <= current_best:
                return record
        
        self.collection.update_one(
            {'user_id': ObjectId(user_id), 'date': today},
            update_op
        )
        
        # Görev ilerlemelerini güncelle
        self._update_task_progress(user_id, today)
        
        return self.get_user_daily_tasks(user_id)
    
    def _update_task_progress(self, user_id, date):
        """Görev ilerlemelerini daily_stats'a göre günceller."""
        record = self.collection.find_one({
            'user_id': ObjectId(user_id),
            'date': date
        })
        
        if not record:
            return
        
        daily_stats = record.get('daily_stats', {})
        tasks = record.get('tasks', [])
        
        for i, task in enumerate(tasks):
            task_definitions = self.get_task_definitions()
            task_def = task_definitions.get(task['task_id'])
            if not task_def:
                continue
            
            # task_type veya track_field'ı al
            track_field = task_def.get('task_type') or task_def.get('track_field', 'games_played')
            current_value = daily_stats.get(track_field, 0)
            
            # İlerlemeyi güncelle
            tasks[i]['progress'] = min(current_value, task['target'])
            tasks[i]['completed'] = current_value >= task['target']
        
        self.collection.update_one(
            {'user_id': ObjectId(user_id), 'date': date},
            {'$set': {'tasks': tasks}}
        )
    
    def claim_reward(self, user_id, task_id):
        """
        Tamamlanan görevin ödülünü talep eder.
        """
        today = self.get_today_date()
        record = self.collection.find_one({
            'user_id': ObjectId(user_id),
            'date': today
        })
        
        if not record:
            return {'success': False, 'error': 'Günlük kayıt bulunamadı'}
        
        tasks = record.get('tasks', [])
        task_index = None
        task = None
        
        for i, t in enumerate(tasks):
            if t['task_id'] == task_id:
                task_index = i
                task = t
                break
        
        if task is None:
            return {'success': False, 'error': 'Görev bulunamadı'}
        
        if not task['completed']:
            return {'success': False, 'error': 'Görev henüz tamamlanmadı'}
        
        if task['reward_claimed']:
            return {'success': False, 'error': 'Ödül zaten alındı'}
        
        # Ödülü ver
        reward_amount = task['reward_amount']
        
        # Kullanıcıya puan ekle
        self.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$inc': {'statistics.total_score': reward_amount}}
        )
        
        # Görevi güncelle
        tasks[task_index]['reward_claimed'] = True
        self.collection.update_one(
            {'user_id': ObjectId(user_id), 'date': today},
            {'$set': {'tasks': tasks}}
        )
        
        return {
            'success': True,
            'reward_amount': reward_amount,
            'message': f'+{reward_amount} puan kazandınız!'
        }
    
    def get_task_definitions(self):
        """Tüm görev tanımlarını döndürür."""
        return list(self.TASK_DEFINITIONS.values())
