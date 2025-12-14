# models/daily_task.py
from bson.objectid import ObjectId
from datetime import datetime, timedelta

class DailyTask:
    """
    Günlük görev sistemi.
    Her gün yeni görevler oluşturulur ve kullanıcılar tamamladıkça ödül kazanır.
    """
    
    # Görev tanımları
    TASK_DEFINITIONS = {
        'PLAY_3_GAMES': {
            'id': 'PLAY_3_GAMES',
            'name': '3 Oyun Oyna',
            'description': 'Bugün 3 oyun tamamla',
            'icon': '🎮',
            'target': 3,
            'reward_type': 'score',
            'reward_amount': 100,
            'track_field': 'games_played'
        },
        'WIN_5_CORRECT': {
            'id': 'WIN_5_CORRECT',
            'name': '5 Doğru Cevap',
            'description': 'Bugün 5 doğru cevap ver',
            'icon': '✅',
            'target': 5,
            'reward_type': 'score',
            'reward_amount': 75,
            'track_field': 'correct_answers'
        },
        'EARN_500_POINTS': {
            'id': 'EARN_500_POINTS',
            'name': '500 Puan Kazan',
            'description': 'Bugün toplam 500 puan kazan',
            'icon': '💰',
            'target': 500,
            'reward_type': 'score',
            'reward_amount': 150,
            'track_field': 'score_earned'
        },
        'STREAK_3': {
            'id': 'STREAK_3',
            'name': '3\'lü Seri',
            'description': 'Bugün 3 doğru cevap serisi yap',
            'icon': '🔥',
            'target': 3,
            'reward_type': 'score',
            'reward_amount': 100,
            'track_field': 'best_streak'
        },
        'PLAY_1_GAME': {
            'id': 'PLAY_1_GAME',
            'name': 'Günlük Oyun',
            'description': 'Bugün en az 1 oyun oyna',
            'icon': '📅',
            'target': 1,
            'reward_type': 'score',
            'reward_amount': 50,
            'track_field': 'games_played'
        }
    }
    
    def __init__(self, db):
        self.collection = db.daily_tasks
        self.users = db.users
    
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
        # Her gün için 3 rastgele görev seç
        import random
        task_ids = list(self.TASK_DEFINITIONS.keys())
        selected_tasks = random.sample(task_ids, min(3, len(task_ids)))
        
        tasks = []
        for task_id in selected_tasks:
            task_def = self.TASK_DEFINITIONS[task_id]
            tasks.append({
                'task_id': task_id,
                'name': task_def['name'],
                'description': task_def['description'],
                'icon': task_def['icon'],
                'target': task_def['target'],
                'progress': 0,
                'completed': False,
                'reward_claimed': False,
                'reward_type': task_def['reward_type'],
                'reward_amount': task_def['reward_amount']
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
            task_def = self.TASK_DEFINITIONS.get(task['task_id'])
            if not task_def:
                continue
            
            track_field = task_def['track_field']
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
