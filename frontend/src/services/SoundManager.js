// frontend/src/services/SoundManager.js
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Static imports to avoid bundler issues
let correctSound, wrongSound, countdownSound, achievementSound, levelupSound, clickSound;

try {
  correctSound = require('./../assets/sounds/correct.mp3');
} catch (e) {
  console.warn('⚠️ correct.mp3 bulunamadı');
}

try {
  wrongSound = require('./../assets/sounds/wrong.mp3');
} catch (e) {
  console.warn('⚠️ wrong.mp3 bulunamadı');
}

try {
  countdownSound = require('./../assets/sounds/countdown.mp3');
} catch (e) {
  console.warn('⚠️ countdown.mp3 bulunamadı');
}

try {
  achievementSound = require('./../assets/sounds/achievement.mp3');
} catch (e) {
  console.warn('⚠️ achievement.mp3 bulunamadı');
}

try {
  levelupSound = require('./../assets/sounds/levelup.mp3');
} catch (e) {
  console.warn('⚠️ levelup.mp3 bulunamadı');
}

try {
  clickSound = require('./../assets/sounds/click.mp3');
} catch (e) {
  console.warn('⚠️ click.mp3 bulunamadı');
}

class SoundManager {
  constructor() {
    this.sounds = {};
    this.isEnabled = true;
    this.isLoaded = false;
  }

  async loadSounds() {
    if (this.isLoaded) return;

    try {
      console.log('🔊 Ses efektleri yükleniyor...');

      const files = {
        correct: correctSound,
        wrong: wrongSound,
        countdown: countdownSound,
        achievement: achievementSound,
        levelup: levelupSound,
        click: clickSound,
      };

      for (const [key, source] of Object.entries(files)) {
        if (!source) {
          console.warn(`⚠️ ${key} ses dosyası yüklenmedi (exports yok)`);
          this.sounds[key] = null;
          continue;
        }

        try {
          const { sound } = await Audio.Sound.createAsync(source);
          this.sounds[key] = sound;
          console.log(`✅ ${key} sesi yüklendi`);
        } catch (error) {
          console.warn(`⚠️ ${key} sesi yüklenemedi: ${error?.message || error}`);
          this.sounds[key] = null;
        }
      }

      this.isLoaded = true;
      const loadedCount = Object.values(this.sounds).filter(s => s !== null).length;
      console.log(`🎵 ${loadedCount}/${Object.keys(files).length} ses yüklendi`);
    } catch (error) {
      console.error('❌ Ses yükleme hatası:', error);
      this.isLoaded = false;
    }
  }

  async playSound(soundName) {
    if (!this.isEnabled) return;

    try {
      if (!this.isLoaded) {
        await this.loadSounds();
      }

      const sound = this.sounds[soundName];
      if (!sound) {
        console.warn(`⚠️ Ses yok veya yüklenmedi: ${soundName}`);
        return;
      }

      await sound.replayAsync();
      console.log(`🔊 ${soundName} sesi çalındı`);
    } catch (error) {
      console.error(`❌ ${soundName} çalma hatası:`, error);
    }
  }

  async setEnabled(enabled) {
    try {
      this.isEnabled = !!enabled;
      await AsyncStorage.setItem('sound_enabled', this.isEnabled ? '1' : '0');
      console.log(`🔊 Ses ${this.isEnabled ? 'açıldı' : 'kapatıldı'}`);
      if (!this.isEnabled) {
        // optionally unload to free memory
        await this.unloadSounds();
      }
    } catch (error) {
      console.warn('Ses tercih kaydedilemedi:', error);
    }
  }

  async getEnabled() {
    try {
      const v = await AsyncStorage.getItem('sound_enabled');
      if (v === null) return this.isEnabled;
      return v === '1';
    } catch (error) {
      return this.isEnabled;
    }
  }

  async unloadSounds() {
    try {
      for (const sound of Object.values(this.sounds)) {
        await sound.unloadAsync();
      }
      this.sounds = {};
      this.isLoaded = false;
      console.log('🔇 Tüm sesler kapatıldı');
    } catch (error) {
      console.error('Ses kapatma hatası:', error);
    }
  }

  // Özel ses efektleri
  async playCorrect() {
    await this.playSound('correct');
  }

  async playWrong() {
    await this.playSound('wrong');
  }

  async playCountdown() {
    await this.playSound('countdown');
  }

  async playAchievement() {
    await this.playSound('achievement');
  }

  async playLevelUp() {
    await this.playSound('levelup');
  }

  async playClick() {
    await this.playSound('click');
  }
}

// Singleton instance
const soundManager = new SoundManager();
export default soundManager;