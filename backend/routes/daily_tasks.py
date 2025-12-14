# routes/daily_tasks.py
from flask import Blueprint, request, jsonify, current_app
from models.daily_task import DailyTask
from routes.game import token_required

daily_tasks_bp = Blueprint('daily_tasks', __name__)

@daily_tasks_bp.route('/tasks', methods=['GET'])
@token_required
def get_daily_tasks(current_user_id):
    """
    Kullanıcının bugünkü günlük görevlerini getirir.
    """
    try:
        db = current_app.db
        daily_task_model = DailyTask(db)
        
        record = daily_task_model.get_user_daily_tasks(current_user_id)
        
        # ObjectId'leri string'e çevir
        if record:
            record['_id'] = str(record['_id'])
            record['user_id'] = str(record['user_id'])
        
        return jsonify({
            'success': True,
            'date': record.get('date'),
            'tasks': record.get('tasks', []),
            'daily_stats': record.get('daily_stats', {})
        })
        
    except Exception as e:
        print(f"❌ Günlük görevler alınırken hata: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@daily_tasks_bp.route('/claim/<task_id>', methods=['POST'])
@token_required
def claim_task_reward(current_user_id, task_id):
    """
    Tamamlanan görevin ödülünü talep eder.
    """
    try:
        db = current_app.db
        daily_task_model = DailyTask(db)
        
        result = daily_task_model.claim_reward(current_user_id, task_id)
        
        if result['success']:
            return jsonify(result)
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print(f"❌ Ödül talep edilirken hata: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@daily_tasks_bp.route('/definitions', methods=['GET'])
@token_required
def get_task_definitions(current_user_id):
    """
    Tüm görev tanımlarını döndürür.
    """
    try:
        db = current_app.db
        daily_task_model = DailyTask(db)
        
        definitions = daily_task_model.get_task_definitions()
        
        return jsonify({
            'success': True,
            'definitions': definitions
        })
        
    except Exception as e:
        print(f"❌ Görev tanımları alınırken hata: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
