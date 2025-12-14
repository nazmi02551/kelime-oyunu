# models/active_game.py
from datetime import datetime
from bson.objectid import ObjectId

class ActiveGame:
    def __init__(self, db):
        if db is None:
            raise ValueError("Database connection is required")
        self.collection = db.active_games

    def create_game(self, user_id, game_state, game_history_id):
        """Creates a new active game record."""
        now = datetime.utcnow()
        return self.collection.insert_one({
            "user_id": ObjectId(user_id),
            "game_state": game_state,
            "used_words": [],
            "game_history_id": ObjectId(game_history_id),
            "last_question_index": None,
            "created_at": now,
            "updated_at": now
        })

    def get_game(self, user_id):
        """Retrieves the active game for a user."""
        return self.collection.find_one({"user_id": ObjectId(user_id)})

    def update_game(self, user_id, updates):
        """Updates an active game record."""
        updates["updated_at"] = datetime.utcnow()
        return self.collection.update_one(
            {"user_id": ObjectId(user_id)},
            {"$set": updates}
        )

    def add_used_word(self, user_id, word_id):
        """Adds a word to the list of used words for the game."""
        return self.collection.update_one(
            {"user_id": ObjectId(user_id)},
            {"$push": {"used_words": str(word_id)}}
        )
        
    def clear_used_words(self, user_id):
        """Clears the used words list for a user's game."""
        return self.collection.update_one(
            {"user_id": ObjectId(user_id)},
            {"$set": {"used_words": []}}
        )

    def delete_game(self, user_id):
        """Deletes an active game record for a user."""
        return self.collection.delete_one({"user_id": ObjectId(user_id)})

    def ensure_indexes(self):
        """Ensures the necessary indexes are created."""
        self.collection.create_index("user_id", unique=True)
        self.collection.create_index("created_at", expireAfterSeconds=3600 * 2) # Expire games after 2 hours
