# services/settings.py
from models.settings import Settings as SettingsModel

def get_game_settings(db):
    """
    Retrieves game settings from the database.
    If no settings are found, it creates and returns default settings.
    """
    settings_model = SettingsModel(db)
    settings = settings_model.get_settings()
    if not settings:
        settings_model.ensure_default_settings()
        settings = settings_model.get_settings()
    return settings

def update_game_settings(db, new_settings):
    """
    Updates game settings in the database.
    """
    settings_model = SettingsModel(db)
    return settings_model.update_settings(new_settings)
