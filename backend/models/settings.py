# models/settings.py
from datetime import datetime, timezone

class Settings:
    def __init__(self, db):
        if db is None:
            raise ValueError("Database connection is required")
        self.collection = db.settings

    def get_settings(self):
        """Retrieves the current game settings."""
        return self.collection.find_one({})

    def update_settings(self, new_settings):
        """Updates game settings."""
        return self.collection.replace_one({}, new_settings, upsert=True)

    def ensure_default_settings(self):
        """Ensures that default settings are present in the database."""
        if self.collection.count_documents({}) == 0:
            default_settings = {
                "min_harf": 4,
                "max_harf": 10,
                "base_time_per_question": 17,
                "joker_costs": {"reveal_letter": 100, "reveal_half": 300, "skip_question": 400},
                "max_harf_limit": 12,
                "level_xp": 1000,
                "created_at": datetime.now(timezone.utc)
            }
            self.collection.insert_one(default_settings)
            print("✅ Default settings created in the database.")

