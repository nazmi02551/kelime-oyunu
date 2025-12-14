// frontend/src/services/AchievementManager.js
import soundManager from './SoundManager';
import api from './api';
import EventBus from './EventBus';

class AchievementManager {
  constructor() {
    // Achievement definitions (stateless). Do not mutate these objects directly.
    this.achievements = {
      FIRST_GAME: {
        id: 'FIRST_GAME',
        name: 'İlk Oyun',
        description: 'İlk oyununu tamamla',
        icon: '🎮',
        sound: 'achievement',
        condition: (user) => user?.statistics?.games_played >= 1,
      },
      STREAK_5: {
        id: 'STREAK_5', 
        name: 'Ateşli Seri',
        description: '5 soru üst üste doğru cevapla',
        icon: '🔥',
        sound: 'levelup',
        condition: (user) => user?.statistics?.current_streak >= 5,
      },
      PERFECT_GAME: {
        id: 'PERFECT_GAME',
        name: 'Kusursuz Oyun',
        description: 'Bir oyunda tüm soruları doğru cevapla',
        icon: '⭐',
        sound: 'achievement',
        condition: (user, gameData) => gameData?.correct_answers === gameData?.total_questions && gameData?.total_questions > 0,
      },
      SCORE_1000: {
        id: 'SCORE_1000',
        name: 'Puan Avcısı', 
        description: '1000 puan topla',
        icon: '🏆',
        sound: 'levelup',
        condition: (user) => user?.statistics?.total_score >= 1000,
      },
      CATEGORY_MASTER: {
        id: 'CATEGORY_MASTER',
        name: 'Kategori Ustası',
        description: 'Bir kategoride 10 doğru cevap ver',
        icon: '📚',
        sound: 'achievement',
        condition: (user) => user?.statistics?.total_correct_answers >= 10,
      },
      SPEED_DEMON: {
        id: 'SPEED_DEMON',
        name: 'Hız Canavarı',
        description: 'Ortalama cevap süren 15 saniyenin altında olsun',
        icon: '⚡',
        sound: 'levelup',
        condition: (user) => user?.statistics?.average_answer_time < 15,
      },
      WORD_EXPLORER: {
        id: 'WORD_EXPLORER',
        name: 'Kelime Kaşifi',
        description: '50 farklı kelime çöz',
        icon: '🔍',
        sound: 'achievement',
        condition: (user) => user?.statistics?.unique_words_played >= 50,
      },
      CONSISTENT_PLAYER: {
        id: 'CONSISTENT_PLAYER',
        name: 'Düzenli Oyuncu',
        description: '10 oyun tamamla',
        icon: '📅',
        sound: 'levelup',
        condition: (user) => user?.statistics?.games_played >= 10,
      }
    };
  }

  // Stateless check that returns which achievement IDs should be unlocked
  computeUnlockedIds(user, gameData = null) {
    const currentlyUnlocked = (user?.achievements || []).map(a => a.id);
    const newlyUnlocked = [];
    for (const achievement of Object.values(this.achievements)) {
      try {
        if (achievement.condition(user, gameData) && !currentlyUnlocked.includes(achievement.id)) {
          newlyUnlocked.push(achievement.id);
        }
      } catch (e) {
        console.warn('Achievement condition error', achievement.id, e);
      }
    }
    return newlyUnlocked;
  }

  // Check and persist newly unlocked achievements via API, play sounds and emit events
  async checkAndPersist(user, gameData = null) {
    const ids = this.computeUnlockedIds(user, gameData);
    if (!ids || ids.length === 0) {
      // Even if no new achievements, emit leaderboard update on game completion
      EventBus.emit('leaderboard:updated');
      return [];
    }

    // Play sounds (best-effort)
    for (const id of ids) {
      const def = this.achievements[id];
      if (def?.sound) {
        try { soundManager.playSound(def.sound); } catch (e) { /* ignore */ }
      }
      // Emit individual achievement unlock event for UI notification
      EventBus.emit('achievement:unlocked', def);
    }

    try {
      const resp = await api.post('/api/game/unlock-achievement', { achievement_ids: ids, source: 'game' });
      const updated = resp.data?.achievements || [];
      // Emit update for UI and leaderboard refresh (since user gained achievements)
      EventBus.emit('achievements:updated', updated);
      EventBus.emit('leaderboard:updated');
      return updated;
    } catch (e) {
      console.warn('Achievement persist failed', e);
      return [];
    }
  }

  getDefinitions() {
    return this.achievements;
  }

  // Helper: get unlocked achievements from authoritative server data
  getUnlockedAchievementsForUser(user) {
    const ids = (user?.achievements || []).map(a => a.id);
    return Object.values(this.achievements).filter(a => ids.includes(a.id));
  }

  // Helper: get locked achievements from server data
  getLockedAchievementsForUser(user) {
    const ids = (user?.achievements || []).map(a => a.id);
    return Object.values(this.achievements).filter(a => !ids.includes(a.id));
  }

  getAchievementProgress(user) {
    const total = Object.keys(this.achievements).length;
    const unlocked = (user?.achievements || []).length;
    return {
      unlocked,
      total,
      percentage: Math.round((unlocked / total) * 100)
    };
  }

  reset() {
    // Stateless manager: reset does not alter definitions. This is kept for compatibility.
  }
}

// Singleton instance
const achievementManager = new AchievementManager();
export default achievementManager;