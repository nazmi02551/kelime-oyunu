# models/multiplayer_game.py
from datetime import datetime, timedelta
from bson import ObjectId
import random

class MultiplayerGame:
    """Çok oyunculu oyun sistemi."""
    
    STATUS_WAITING = 'waiting'      # Oyuncular bekleniyor
    STATUS_IN_PROGRESS = 'in_progress'  # Oyun devam ediyor
    STATUS_COMPLETED = 'completed'   # Oyun bitti
    STATUS_CANCELLED = 'cancelled'   # Oyun iptal edildi
    
    def __init__(self, db):
        self.db = db
        self.collection = db.multiplayer_games
        self.users = db.users
        self.words = db.words
        self.ensure_indexes()
    
    def ensure_indexes(self):
        """Gerekli index'leri oluşturur."""
        try:
            self.collection.create_index([('player1', 1), ('player2', 1)])
            self.collection.create_index('status')
            self.collection.create_index('created_at', expireAfterSeconds=86400)  # 24 saat sonra sil
        except Exception as e:
            print(f"⚠️  MultiplayerGame index hatası: {e}")
    
    def create_game(self, player1_id, player2_id, game_settings=None):
        """
        Yeni multiplayer oyun oluşturur.
        """
        settings = game_settings or {}
        question_count = settings.get('question_count', 10)
        
        # Kelimeleri seç - metadata.is_active kullan
        words = list(self.words.aggregate([
            {'$match': {'metadata.is_active': True}},
            {'$sample': {'size': question_count}}
        ]))
        
        if len(words) < question_count:
            return {'success': False, 'error': 'Yeterli kelime bulunamadı'}
        
        # Oyuncuları al
        player1 = self.users.find_one({'_id': ObjectId(player1_id)})
        player2 = self.users.find_one({'_id': ObjectId(player2_id)})
        
        if not player1 or not player2:
            return {'success': False, 'error': 'Oyuncu bulunamadı'}
        
        # Soruları hazırla - Türkçe alan adları kullan
        questions = []
        for word in words:
            questions.append({
                'word_id': str(word['_id']),
                'word': word.get('kelime'),
                'meaning': word.get('aciklama'),
                'category': word.get('kategori'),
                'difficulty': word.get('zorluk', 'orta'),
                'options': self._generate_options(word),
                'player1_answer': None,
                'player2_answer': None,
                'player1_correct': None,
                'player2_correct': None,
                'player1_time': None,
                'player2_time': None
            })
        
        game = {
            'player1': ObjectId(player1_id),
            'player1_username': player1.get('username'),
            'player2': ObjectId(player2_id),
            'player2_username': player2.get('username'),
            'questions': questions,
            'current_question': 0,
            'player1_score': 0,
            'player2_score': 0,
            'player1_ready': False,
            'player2_ready': False,
            'status': self.STATUS_WAITING,
            'settings': settings,
            'created_at': datetime.utcnow(),
            'started_at': None,
            'completed_at': None,
            'winner': None
        }
        
        result = self.collection.insert_one(game)
        
        return {
            'success': True,
            'game_id': str(result.inserted_id),
            'message': 'Multiplayer oyun oluşturuldu'
        }
    
    def _generate_options(self, word):
        """Kelime için şıkları oluşturur."""
        correct_answer = word.get('aciklama')  # Türkçe alan adı
        
        # Diğer kelimelerden yanlış şıklar al
        wrong_words = list(self.words.aggregate([
            {'$match': {
                '_id': {'$ne': word['_id']},
                'metadata.is_active': True  # Doğru alan
            }},
            {'$sample': {'size': 3}}
        ]))
        
        options = [correct_answer]
        for w in wrong_words:
            options.append(w.get('aciklama'))  # Türkçe alan adı
        
        # Eksik şık varsa doldur
        while len(options) < 4:
            options.append(f"Seçenek {len(options) + 1}")
        
        random.shuffle(options)
        return options
    
    def set_player_ready(self, game_id, user_id):
        """Oyuncuyu hazır olarak işaretler."""
        game = self.collection.find_one({'_id': ObjectId(game_id)})
        if not game:
            return {'success': False, 'error': 'Oyun bulunamadı'}
        
        update = {}
        if game['player1'] == ObjectId(user_id):
            update['player1_ready'] = True
        elif game['player2'] == ObjectId(user_id):
            update['player2_ready'] = True
        else:
            return {'success': False, 'error': 'Bu oyunda değilsiniz'}
        
        self.collection.update_one(
            {'_id': ObjectId(game_id)},
            {'$set': update}
        )
        
        # Her iki oyuncu da hazırsa oyunu başlat
        game = self.collection.find_one({'_id': ObjectId(game_id)})
        if game.get('player1_ready') and game.get('player2_ready'):
            self.collection.update_one(
                {'_id': ObjectId(game_id)},
                {'$set': {
                    'status': self.STATUS_IN_PROGRESS,
                    'started_at': datetime.utcnow()
                }}
            )
            return {'success': True, 'message': 'Oyun başladı!', 'game_started': True}
        
        return {'success': True, 'message': 'Hazır olarak işaretlendi', 'game_started': False}
    
    def submit_answer(self, game_id, user_id, question_index, answer, time_taken):
        """Oyuncunun cevabını kaydeder."""
        game = self.collection.find_one({'_id': ObjectId(game_id)})
        if not game:
            return {'success': False, 'error': 'Oyun bulunamadı'}
        
        if game['status'] != self.STATUS_IN_PROGRESS:
            return {'success': False, 'error': 'Oyun aktif değil'}
        
        if question_index >= len(game['questions']):
            return {'success': False, 'error': 'Geçersiz soru'}
        
        question = game['questions'][question_index]
        is_correct = answer == question['meaning']
        
        # Hangi oyuncu?
        if game['player1'] == ObjectId(user_id):
            player_prefix = 'player1'
        elif game['player2'] == ObjectId(user_id):
            player_prefix = 'player2'
        else:
            return {'success': False, 'error': 'Bu oyunda değilsiniz'}
        
        # Zaten cevaplamış mı?
        if question.get(f'{player_prefix}_answer') is not None:
            return {'success': False, 'error': 'Bu soruyu zaten cevapladınız'}
        
        # Skoru hesapla
        score_earned = 0
        if is_correct:
            base_score = 10
            time_bonus = max(0, 5 - int(time_taken / 2))  # Hızlı cevap bonusu
            score_earned = base_score + time_bonus
        
        # Güncelle
        update = {
            f'questions.{question_index}.{player_prefix}_answer': answer,
            f'questions.{question_index}.{player_prefix}_correct': is_correct,
            f'questions.{question_index}.{player_prefix}_time': time_taken,
        }
        
        # Skoru güncelle
        self.collection.update_one(
            {'_id': ObjectId(game_id)},
            {
                '$set': update,
                '$inc': {f'{player_prefix}_score': score_earned}
            }
        )
        
        # Oyun bitti mi kontrol et
        game = self.collection.find_one({'_id': ObjectId(game_id)})
        all_answered = all(
            q.get('player1_answer') is not None and q.get('player2_answer') is not None
            for q in game['questions']
        )
        
        if all_answered:
            self._finish_game(game_id)
        
        return {
            'success': True,
            'is_correct': is_correct,
            'score_earned': score_earned,
            'correct_answer': question['meaning']
        }
    
    def _finish_game(self, game_id):
        """Oyunu bitirir ve kazananı belirler."""
        game = self.collection.find_one({'_id': ObjectId(game_id)})
        
        winner = None
        if game['player1_score'] > game['player2_score']:
            winner = game['player1']
        elif game['player2_score'] > game['player1_score']:
            winner = game['player2']
        # Berabere ise winner = None kalır
        
        self.collection.update_one(
            {'_id': ObjectId(game_id)},
            {'$set': {
                'status': self.STATUS_COMPLETED,
                'completed_at': datetime.utcnow(),
                'winner': winner
            }}
        )
        
        # Oyuncu istatistiklerini güncelle
        self._update_player_stats(game)
    
    def _update_player_stats(self, game):
        """Oyuncu istatistiklerini günceller."""
        for player_id in [game['player1'], game['player2']]:
            prefix = 'player1' if player_id == game['player1'] else 'player2'
            score = game[f'{prefix}_score']
            
            correct_answers = sum(1 for q in game['questions'] if q.get(f'{prefix}_correct'))
            wrong_answers = len(game['questions']) - correct_answers
            
            self.users.update_one(
                {'_id': player_id},
                {
                    '$inc': {
                        'statistics.total_score': score,
                        'statistics.games_played': 1,
                        'statistics.total_correct_answers': correct_answers,
                        'statistics.total_wrong_answers': wrong_answers,
                        'statistics.multiplayer_games': 1,
                        'statistics.multiplayer_wins': 1 if game.get('winner') == player_id else 0
                    }
                }
            )
    
    def get_game(self, game_id, user_id):
        """Oyun detaylarını getirir."""
        game = self.collection.find_one({'_id': ObjectId(game_id)})
        if not game:
            return {'success': False, 'error': 'Oyun bulunamadı'}
        
        # Bu oyuncu oyunda mı?
        if game['player1'] != ObjectId(user_id) and game['player2'] != ObjectId(user_id):
            return {'success': False, 'error': 'Bu oyuna erişiminiz yok'}
        
        is_player1 = game['player1'] == ObjectId(user_id)
        
        # Soruları formatla (rakibin cevabını gizle - oyun devam ediyorsa)
        questions = []
        for i, q in enumerate(game['questions']):
            question_data = {
                'index': i,
                'word': q['word'],
                'options': q['options'],
                'my_answer': q.get('player1_answer' if is_player1 else 'player2_answer'),
                'my_correct': q.get('player1_correct' if is_player1 else 'player2_correct'),
                'my_time': q.get('player1_time' if is_player1 else 'player2_time'),
            }
            
            # Oyun bittiyse rakibin cevabını da göster
            if game['status'] == self.STATUS_COMPLETED:
                question_data['opponent_answer'] = q.get('player2_answer' if is_player1 else 'player1_answer')
                question_data['opponent_correct'] = q.get('player2_correct' if is_player1 else 'player1_correct')
                question_data['correct_answer'] = q['meaning']
            
            questions.append(question_data)
        
        return {
            'success': True,
            'game': {
                'game_id': str(game['_id']),
                'opponent_username': game['player2_username'] if is_player1 else game['player1_username'],
                'my_score': game['player1_score'] if is_player1 else game['player2_score'],
                'opponent_score': game['player2_score'] if is_player1 else game['player1_score'],
                'my_ready': game['player1_ready'] if is_player1 else game['player2_ready'],
                'opponent_ready': game['player2_ready'] if is_player1 else game['player1_ready'],
                'status': game['status'],
                'questions': questions,
                'current_question': game['current_question'],
                'winner': 'me' if game.get('winner') == ObjectId(user_id) else ('opponent' if game.get('winner') else 'draw'),
                'created_at': game['created_at'].isoformat(),
                'started_at': game['started_at'].isoformat() if game.get('started_at') else None,
                'completed_at': game['completed_at'].isoformat() if game.get('completed_at') else None
            }
        }
    
    def get_active_games(self, user_id):
        """Kullanıcının aktif oyunlarını getirir."""
        games = list(self.collection.find({
            '$or': [
                {'player1': ObjectId(user_id)},
                {'player2': ObjectId(user_id)}
            ],
            'status': {'$in': [self.STATUS_WAITING, self.STATUS_IN_PROGRESS]}
        }).sort('created_at', -1))
        
        result = []
        for game in games:
            is_player1 = game['player1'] == ObjectId(user_id)
            result.append({
                'game_id': str(game['_id']),
                'opponent_username': game['player2_username'] if is_player1 else game['player1_username'],
                'status': game['status'],
                'my_ready': game['player1_ready'] if is_player1 else game['player2_ready'],
                'opponent_ready': game['player2_ready'] if is_player1 else game['player1_ready'],
                'created_at': game['created_at'].isoformat()
            })
        
        return result

    def cancel_game(self, game_id, user_id):
        """Oyunu iptal eder."""
        game = self.collection.find_one({'_id': ObjectId(game_id)})
        if not game:
            return {'success': False, 'error': 'Oyun bulunamadı'}
        
        # Bu oyuncu oyunda mı?
        if game['player1'] != ObjectId(user_id) and game['player2'] != ObjectId(user_id):
            return {'success': False, 'error': 'Bu oyuna erişiminiz yok'}
        
        # Sadece waiting veya in_progress durumundaki oyunlar iptal edilebilir
        if game['status'] not in [self.STATUS_WAITING, self.STATUS_IN_PROGRESS]:
            return {'success': False, 'error': 'Bu oyun zaten sonlanmış'}
        
        self.collection.update_one(
            {'_id': ObjectId(game_id)},
            {'$set': {
                'status': self.STATUS_CANCELLED,
                'cancelled_by': ObjectId(user_id),
                'cancelled_at': datetime.utcnow()
            }}
        )
        
        return {'success': True, 'message': 'Oyun iptal edildi'}
