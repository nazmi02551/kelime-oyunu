# routes/leaderboard.py
from flask import Blueprint, request, jsonify, current_app
from services.leaderboard import (
    aggregate_leaderboard, 
    get_recent_finishers, 
    get_top_players_by_best_score,
    get_leaderboard_stats
)

leaderboard_bp = Blueprint('leaderboard', __name__)

@leaderboard_bp.route('/leaderboard', methods=['GET'])
def get_leaderboard():
    try:
        period = request.args.get('period', 'all')
        category = request.args.get('category', None)
        limit = int(request.args.get('limit', 50))

        db = current_app.db
        leaderboard_data = aggregate_leaderboard(db, period, category, limit)
        
        # İstatistikleri de getir
        stats = get_leaderboard_stats(db)

        return jsonify({
            'success': True,
            'leaderboard': leaderboard_data,
            'stats': stats,
            'period': period,
            'category': category
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@leaderboard_bp.route('/recent-finishers', methods=['GET'])
def get_recent_finishers_route():
    try:
        limit = int(request.args.get('limit', 5))
        db = current_app.db
        recent_finishers = get_recent_finishers(db, limit)
        
        return jsonify({
            'success': True,
            'recent_finishers': recent_finishers
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@leaderboard_bp.route('/top-players', methods=['GET'])
def get_top_players_route():
    try:
        limit = int(request.args.get('limit', 5))
        db = current_app.db
        top_players = get_top_players_by_best_score(db, limit)
        
        return jsonify({
            'success': True,
            'top_players': top_players
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@leaderboard_bp.route('/stats', methods=['GET'])
def get_leaderboard_stats_route():
    try:
        db = current_app.db
        stats = get_leaderboard_stats(db)
        
        return jsonify({
            'success': True,
            'stats': stats
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@leaderboard_bp.route('/overview', methods=['GET'])
def get_overview_stats():
    """
    Public overview stats used by admin panel (non-sensitive):
      - total_users
      - active_today (users with last_login in last 24 hours)
      - total_games
      - average_score
    """
    try:
        db = current_app.db
        from datetime import datetime, timedelta

        total_users = 0
        if db is not None and 'users' in db.list_collection_names():
            total_users = db.users.count_documents({})

        # active_today: users with metadata.last_login_at in last 24 hours
        active_since = datetime.utcnow() - timedelta(days=1)
        active_today = 0
        if db is not None and 'users' in db.list_collection_names():
            active_today = db.users.count_documents({ 'metadata.last_login_at': { '$gte': active_since } })

        # leaderboard stats for games/averages
        stats = get_leaderboard_stats(db)

        return jsonify({
            'success': True,
            'total_users': int(total_users),
            'active_today': int(active_today),
            'total_games': int(stats.get('total_games', 0)),
            'average_score': int(round(stats.get('average_score', 0.0)))
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500