#!/usr/bin/env python
"""
Database Schema Initialization and Index Setup
Runs on application startup to ensure indexes and schema are properly configured.
"""

from pymongo import ASCENDING, DESCENDING
from datetime import datetime

def init_db_schema(db):
    """
    Initialize database indexes and schema validation.
    """
    if db is None:
        print("⚠️  DB is None, skipping schema initialization")
        return

    try:
        # ========== USERS COLLECTION ==========
        print("📊 Setting up users collection indexes...")
        
        # Index for email (unique, used for login)
        try:
            db.users.create_index([("email", ASCENDING)], unique=True, name="email_unique")
            print("✅ Email index created")
        except Exception as e:
            print(f"⚠️  Email index may already exist: {e}")
        
        # Index for achievements (used in achievement queries and aggregations)
        try:
            db.users.create_index([("achievements.id", ASCENDING)], name="achievements_id")
            print("✅ Achievements ID index created")
        except Exception as e:
            print(f"⚠️  Achievements ID index may already exist: {e}")
        
        # Index for statistics (used in leaderboard queries)
        try:
            db.users.create_index([("statistics.total_score", DESCENDING)], name="total_score_desc")
            print("✅ Total score index created")
        except Exception as e:
            print(f"⚠️  Total score index may already exist: {e}")
        
        # Index for games_played (adaptive difficulty, statistics)
        try:
            db.users.create_index([("statistics.games_played", DESCENDING)], name="games_played_desc")
            print("✅ Games played index created")
        except Exception as e:
            print(f"⚠️  Games played index may already exist: {e}")
        
        # Index for is_admin (admin queries)
        try:
            db.users.create_index([("is_admin", ASCENDING)], name="is_admin")
            print("✅ Admin flag index created")
        except Exception as e:
            print(f"⚠️  Admin flag index may already exist: {e}")
        
        # ========== GAMES COLLECTION ==========
        print("📊 Setting up games collection indexes...")
        
        # Index for user_id and completed_at (game history queries)
        try:
            db.games.create_index([("user_id", ASCENDING), ("completed_at", DESCENDING)], name="user_completed_at")
            print("✅ User and completed_at index created")
        except Exception as e:
            print(f"⚠️  User and completed_at index may already exist: {e}")
        
        # Index for questions.word_id (word statistics)
        try:
            db.games.create_index([("questions.word_id", ASCENDING)], name="questions_word_id")
            print("✅ Questions word_id index created")
        except Exception as e:
            print(f"⚠️  Questions word_id index may already exist: {e}")
        
        # Index for final_score (leaderboard)
        try:
            db.games.create_index([("final_score", DESCENDING)], name="final_score_desc")
            print("✅ Final score index created")
        except Exception as e:
            print(f"⚠️  Final score index may already exist: {e}")
        
        # ========== WORDS COLLECTION ==========
        print("📊 Setting up words collection indexes...")
        
        # Index for is_active (word selection)
        try:
            db.words.create_index([("is_active", ASCENDING)], name="is_active")
            print("✅ Word is_active index created")
        except Exception as e:
            print(f"⚠️  Word is_active index may already exist: {e}")
        
        # Index for kategori and zorluk (word filtering)
        try:
            db.words.create_index([("kategori", ASCENDING), ("zorluk", ASCENDING)], name="kategori_zorluk")
            print("✅ Category and difficulty index created")
        except Exception as e:
            print(f"⚠️  Category and difficulty index may already exist: {e}")
        
        # ========== SETTINGS COLLECTION ==========
        print("📊 Setting up settings collection indexes...")
        
        # Ensure settings collection has the default document
        settings = db.settings.find_one({})
        if not settings:
            default_settings = {
                "min_harf": 4,
                "max_harf": 10,
                "base_time_per_question": 17,
                "joker_costs": {"reveal_letter": 100, "reveal_half": 300, "skip_question": 400},
                "max_harf_limit": 12,
                "level_xp": 1000,
                "base_score_per_question": 100,
                "created_at": datetime.utcnow()
            }
            db.settings.insert_one(default_settings)
            print("✅ Default settings document created")
        
        # ========== SETTINGS_HISTORY COLLECTION ==========
        print("📊 Setting up settings_history collection indexes...")
        
        # Index for changed_at (audit trail queries)
        try:
            db.settings_history.create_index([("changed_at", DESCENDING)], name="changed_at_desc")
            print("✅ Settings history changed_at index created")
        except Exception as e:
            print(f"⚠️  Settings history changed_at index may already exist: {e}")
        
        # Index for changed_by (audit trail by admin)
        try:
            db.settings_history.create_index([("changed_by", ASCENDING)], name="changed_by")
            print("✅ Settings history changed_by index created")
        except Exception as e:
            print(f"⚠️  Settings history changed_by index may already exist: {e}")
        
        # ========== SUMMARY ==========
        print("\n✅ Database schema initialization complete!")
        print("📈 All indexes have been created or verified.")
        
    except Exception as e:
        print(f"\n❌ Database schema initialization failed: {e}")
        raise


if __name__ == "__main__":
    # For manual testing
    from config import Config
    from pymongo import MongoClient
    
    client = MongoClient(Config.MONGO_URI or 'mongodb://localhost:27017/')
    db = client.get_default_database()
    init_db_schema(db)
    print("\n✅ Manual schema initialization complete!")
