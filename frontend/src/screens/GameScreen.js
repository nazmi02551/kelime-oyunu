import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  LayoutAnimation,
  UIManager,
  ScrollView,
  Dimensions,
  useWindowDimensions,
  KeyboardAvoidingView,
  StatusBar,
  Keyboard
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import GameMessage from '../components/GameMessage';
import AchievementNotification from '../components/AchievementNotification';
import { globalStyles, componentStyles } from '../styles/globalStyles';
import { colors } from '../utils/colors';
import soundManager from '../services/SoundManager';
import achievementManager from '../services/AchievementManager';
import { handleApiError } from '../utils/errorHandler';
import EventBus from '../services/EventBus';

const GradientView = ({ colors: gradientColors, style, children }) => {
  if (Platform.OS === 'web') {
    return (
      <View style={[style, { backgroundImage: `linear-gradient(135deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 100%)` }]}>
        {children}
      </View>
    );
  }
  const { LinearGradient } = require('expo-linear-gradient');
  return (
    <LinearGradient colors={gradientColors} style={style}>
      {children}
    </LinearGradient>
  );
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// GameStatsWidget
const GameStatsWidget = ({ user, oyunDurumu }) => {
  if (!user) return null;

  return (
    <View style={componentStyles.game.statsWidget}>
      <View style={componentStyles.game.statItem}>
        <Text style={componentStyles.game.statItemLabel}>Mevcut Seri</Text>
        <Text style={componentStyles.game.statItemValue}>{user.statistics?.current_streak || 0} 🔥</Text>
      </View>
      <View style={componentStyles.game.statItem}>
        <Text style={componentStyles.game.statItemLabel}>En Uzun Seri</Text>
        <Text style={componentStyles.game.statItemValue}>{user.statistics?.longest_streak || 0} ⭐</Text>
      </View>
      <View style={componentStyles.game.statItem}>
        <Text style={componentStyles.game.statItemLabel}>Doğru Cevaplar</Text>
        <Text style={componentStyles.game.statItemValue}>{user.statistics?.total_correct_answers || 0} ✓</Text>
      </View>
      <View style={componentStyles.game.statItem}>
        <Text style={componentStyles.game.statItemLabel}>Başarı Oranı</Text>
        <Text style={componentStyles.game.statItemValue}>{user.statistics?.success_rate ? `${user.statistics.success_rate}%` : '0%'}</Text>
      </View>
    </View>
  );
};

const DifficultyIndicator = ({ user }) => {
  const adaptive = user?.adaptive_difficulty || {};
  const currentModifier = adaptive.current_modifier || 1.0;
  const performanceScore = adaptive.performance_score || 0.5;

  const getDifficultyInfo = () => {
    if (currentModifier > 1.3) return { level: 'UZMAN', color: colors.gameDanger || '#e74c3c', emoji: '🎯' };
    if (currentModifier > 1.0) return { level: 'İLERİ', color: colors.gameWarning || '#f39c12', emoji: '⚡' };
    if (currentModifier > 0.7) return { level: 'ORTA', color: colors.gameSuccess || '#2ecc71', emoji: '🔥' };
    return { level: 'BAŞLANGIÇ', color: colors.gameSecondary || '#95a5a6', emoji: '🌱' };
  };

  const difficulty = getDifficultyInfo();

  return (
    <View style={componentStyles.game.difficultyIndicator}>
      <View style={componentStyles.game.difficultyHeader}>
        <Text style={componentStyles.game.difficultyTitle}>Zorluk Seviyesi</Text>
        <Text style={[componentStyles.game.difficultyLevel, { color: difficulty.color }]}>{difficulty.emoji} {difficulty.level}</Text>
      </View>
      <View style={componentStyles.game.difficultyBar}>
        <View style={[componentStyles.game.difficultyFill, { width: `${performanceScore * 100}%`, backgroundColor: difficulty.color }]} />
      </View>
      <Text style={componentStyles.game.difficultyModifier}>Çarpan: {currentModifier.toFixed(2)}x</Text>
    </View>
  );
};

const GameScreen = ({ navigation }) => {
  const { user, logout, signOut, refreshUserData, updateUserStats } = useContext(AuthContext);
  const doLogout = logout || signOut || (() => {});

  // RESPONSIVE
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isDesktop = windowWidth >= 768;
  const isMobile = windowWidth < 768;

  const [oyunDurumu, setOyunDurumu] = useState(null);
  const [tahmin, setTahmin] = useState('');
  const [tahminModu, setTahminModu] = useState(false);
  const [cevapSuresi, setCevapSuresi] = useState(30);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gameMessage, setGameMessage] = useState(null);
  const [oyunBasladi, setOyunBasladi] = useState(false);
  const [showWordReveal, setShowWordReveal] = useState(false);
  const [revealedWord, setRevealedWord] = useState('');
  const [sidebarContent, setSidebarContent] = useState('stats');

  // leaderboard
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState('daily');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const cevapSureTimerRef = useRef(null);
  const anaSureTimerRef = useRef(null);
  const wordRevealTimerRef = useRef(null);
  const scrollViewRef = useRef(null);
  const tahminInputRef = useRef(null);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [recentAchievements, setRecentAchievements] = useState([]);
  const [showAchievementNotification, setShowAchievementNotification] = useState(false);

  // --- Sidebar API state ---
  const [kelimeIstatistikleri, setKelimeIstatistikleri] = useState(null);
  const [performansAnalizi, setPerformansAnalizi] = useState(null);
  const [oyunGecmisi, setOyunGecmisi] = useState([]);
  const [basarimlar, setBasarimlar] = useState([]);
  const [sidebarLoading, setSidebarLoading] = useState(false);
  const aktifKelimeId = oyunDurumu?.kelime_id;

  // Oyun başladığında/geçişte geçmişi sıfırla
  useEffect(() => {
    if (oyunBasladi) {
      setOyunGecmisi([]);
    }
  }, [oyunBasladi]);

  // Sidebar verilerini fetch et
  useEffect(() => {
    if (!isDesktop || !oyunDurumu || !aktifKelimeId) return;
    setSidebarLoading(true);
    // 1. Kelime istatistikleri
    api.get(`/api/game/word-statistics/${aktifKelimeId}`)
      .then(res => setKelimeIstatistikleri(res.data))
      .catch(() => setKelimeIstatistikleri(null));
    // 2. Performans analizi
    api.get('/api/game/performance-analysis')
      .then(res => setPerformansAnalizi(res.data))
      .catch(() => setPerformansAnalizi(null));
    // 3. Başarımlar
    api.get('/api/game/user-achievements')
      .then(res => setBasarimlar(res.data.achievements || []))
      .catch(() => setBasarimlar([]));
    setSidebarLoading(false);
  }, [isDesktop, aktifKelimeId]);

  // Refactor LeftSidebar into a prop-driven component so we can memoize it
  const LeftSidebarInner = ({ isDesktop: lsDesktop, oyunDurumu: lsOyunDurumu, kelimeIstatistikleri: lsKelimeIstatistikleri, performansAnalizi: lsPerformansAnalizi, oyunGecmisi: lsOyunGecmisi, basarimlar: lsBasarimlar }) => {
    if (!lsDesktop || !lsOyunDurumu) return null;
    return (
      <View style={[componentStyles.game.sidebar, { width: 320, marginRight: 15, height: '100%' }]}> 
        <View style={componentStyles.game.sidebarHeader}>
          <Text style={componentStyles.game.sidebarTitle}>🎮 Oyun Detayları</Text>
        </View>
        <ScrollView style={componentStyles.game.sidebarContent} showsVerticalScrollIndicator={false}>
          {/* Kelime İstatistikleri */}
          <View style={componentStyles.game.sidebarSection}>
            <Text style={componentStyles.game.sidebarSectionTitle}>📊 Kelime İstatistikleri</Text>
            {sidebarLoading ? <ActivityIndicator color={colors.primary} /> : lsKelimeIstatistikleri ? (
              <>
                <View style={componentStyles.game.wordStats}>
                  <View style={componentStyles.game.wordStatRow}>
                    <Text style={componentStyles.game.wordStatLabel}>Kelime:</Text>
                    <Text style={componentStyles.game.wordStatValue}>{lsKelimeIstatistikleri.word}</Text>
                  </View>
                  <View style={componentStyles.game.wordStatRow}>
                    <Text style={componentStyles.game.wordStatLabel}>Kategori:</Text>
                    <Text style={componentStyles.game.wordStatValue}>{lsKelimeIstatistikleri.category}</Text>
                  </View>
                  <View style={componentStyles.game.wordStatRow}>
                    <Text style={componentStyles.game.wordStatLabel}>Zorluk:</Text>
                    <Text style={[componentStyles.game.wordStatValue, componentStyles.game.difficultyMedium]}>{lsKelimeIstatistikleri.difficulty} 🔥</Text>
                  </View>
                </View>
                <View style={componentStyles.game.statsGrid}>
                  <View style={componentStyles.game.statBox}>
                    <Text style={componentStyles.game.statNumber}>{lsKelimeIstatistikleri.total_asked}</Text>
                    <Text style={componentStyles.game.statLabel}>Toplam Sorulma</Text>
                  </View>
                  <View style={componentStyles.game.statBox}>
                    <Text style={[componentStyles.game.statNumber, componentStyles.game.correctStat]}>{lsKelimeIstatistikleri.correct_answers}</Text>
                    <Text style={componentStyles.game.statLabel}>Doğru Cevap</Text>
                  </View>
                  <View style={componentStyles.game.statBox}>
                    <Text style={[componentStyles.game.statNumber, componentStyles.game.wrongStat]}>{lsKelimeIstatistikleri.wrong_answers}</Text>
                    <Text style={componentStyles.game.statLabel}>Yanlış Cevap</Text>
                  </View>
                </View>
                <View style={componentStyles.game.progressSection}>
                  <View style={componentStyles.game.progressLabels}>
                    <Text style={componentStyles.game.progressLabel}>Doğru Oranı</Text>
                    <Text style={componentStyles.game.progressPercentage}>%{lsKelimeIstatistikleri.correct_percentage}</Text>
                  </View>
                  <View style={componentStyles.game.progressBar}>
                    <View style={[componentStyles.game.progressFill, { width: `${lsKelimeIstatistikleri.correct_percentage}%`, backgroundColor: colors.success }]} />
                  </View>
                </View>
              </>
            ) : (
              <Text style={{ color: colors.textMuted }}>Veri yok.</Text>
            )}
          </View>
          {/* Performans Analizi */}
          <View style={componentStyles.game.sidebarSection}>
            <Text style={componentStyles.game.sidebarSectionTitle}>📈 Performans Analizi</Text>
            {sidebarLoading ? <ActivityIndicator color={colors.primary} /> : lsPerformansAnalizi ? (
              <View style={componentStyles.game.performanceGrid}>
                <View style={componentStyles.game.performanceItem}>
                  <Text style={componentStyles.game.performanceLabel}>Başarı Oranı</Text>
                  <View style={componentStyles.game.performanceValueContainer}>
                    <Text style={[componentStyles.game.performanceValue, componentStyles.game.performanceGood]}>%{lsPerformansAnalizi.user_success_rate}</Text>
                  </View>
                </View>
                <View style={componentStyles.game.performanceItem}>
                  <Text style={componentStyles.game.performanceLabel}>Kategori Ortalaması</Text>
                  <Text style={componentStyles.game.performanceValue}>%{lsPerformansAnalizi.category_average}</Text>
                </View>
                <View style={componentStyles.game.performanceItem}>
                  <Text style={componentStyles.game.performanceLabel}>Ortalama Cevap Süresi</Text>
                  <Text style={[componentStyles.game.performanceValue, componentStyles.game.performanceFast]}>{lsPerformansAnalizi.average_response_time}s ⚡</Text>
                </View>
                <View style={componentStyles.game.performanceItem}>
                  <Text style={componentStyles.game.performanceLabel}>Zorluk Çarpanı</Text>
                  <Text style={componentStyles.game.performanceValue}>{lsPerformansAnalizi.difficulty_multiplier}x</Text>
                </View>
              </View>
            ) : (
              <Text style={{ color: colors.textMuted }}>Veri yok.</Text>
            )}
          </View>
          {/* Oyun Geçmişi */}
          <View style={componentStyles.game.sidebarSection}>
            <Text style={componentStyles.game.sidebarSectionTitle}>🕐 Oyun Geçmişi</Text>
            <View style={componentStyles.game.gameHistory}>
              {lsOyunGecmisi.length > 0 ? lsOyunGecmisi.map((soru, idx) => (
                <View key={idx} style={componentStyles.game.historyItem}>
                  <View style={componentStyles.game.historyMain}>
                    <Text style={componentStyles.game.historyWord}>{soru.word}</Text>
                    <View style={[componentStyles.game.historyResult, soru.result ? componentStyles.game.historyCorrect : componentStyles.game.historyWrong]}>
                      <Text style={componentStyles.game.historyResultText}>{soru.result ? '✓' : '✗'} {soru.score > 0 ? '+' : ''}{soru.score} puan</Text>
                    </View>
                  </View>
                </View>
              )) : <Text style={{ color: colors.textMuted }}>Kayıt yok</Text>}
            </View>
          </View>
          {/* Başarımlar */}
          <View style={componentStyles.game.sidebarSection}>
            <Text style={componentStyles.game.sidebarSectionTitle}>🎯 Başarımlar</Text>
            <View style={componentStyles.game.achievementsList}>
              {lsBasarimlar.length > 0 ? lsBasarimlar.map((basarim) => (
                <View key={basarim.id} style={componentStyles.game.achievementItem}>
                  <Text style={componentStyles.game.achievementIcon}>{basarim.icon}</Text>
                  <View style={componentStyles.game.achievementInfo}>
                    <Text style={componentStyles.game.achievementName}>{basarim.name}</Text>
                    <View style={componentStyles.game.achievementProgress}>
                      <View style={componentStyles.game.progressBar}>
                        <View style={[componentStyles.game.progressFill, { width: `${Math.min(100, (basarim.progress / basarim.target) * 100)}%`, backgroundColor: colors.primary }]} />
                      </View>
                      <Text style={componentStyles.game.achievementProgressText}>{basarim.progress}/{basarim.target}</Text>
                    </View>
                  </View>
                </View>
              )) : <Text style={{ color: colors.textMuted }}>Kayıt yok</Text>}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

  const LeftSidebar = React.memo(LeftSidebarInner, (prevProps, nextProps) => {
    return (
      prevProps.isDesktop === nextProps.isDesktop &&
      prevProps.oyunDurumu?.soru_sayaci === nextProps.oyunDurumu?.soru_sayaci &&
      prevProps.oyunGecmisi?.length === nextProps.oyunGecmisi?.length &&
      JSON.stringify(prevProps.kelimeIstatistikleri) === JSON.stringify(nextProps.kelimeIstatistikleri) &&
      JSON.stringify(prevProps.performansAnalizi) === JSON.stringify(nextProps.performansAnalizi) &&
      JSON.stringify(prevProps.basarimlar) === JSON.stringify(nextProps.basarimlar)
    );
  });

  // Sound manager
  useEffect(() => {
    soundManager.loadSounds();

    return () => {
      soundManager.unloadSounds();
      clearTimers();
    };
  }, []);

  const toggleSound = async () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    try {
      await soundManager.setEnabled(newState);
    } catch (e) {
      console.warn('Ses aç/kapa hatası', e);
    }
    if (newState) soundManager.playClick();
  };

  useEffect(() => {
    if (tahminModu && cevapSuresi <= 10 && cevapSuresi > 0) {
      soundManager.playCountdown();
    }
  }, [cevapSuresi, tahminModu]);

  const handleButtonPress = async (action) => {
    soundManager.playClick();
    return action();
  };

  useEffect(() => {
    if (tahminModu && tahminInputRef.current) {
      setTimeout(() => tahminInputRef.current?.focus(), 100);
    }
  }, [tahminModu]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => { keyboardDidShowListener.remove(); keyboardDidHideListener.remove(); };
  }, []);

  const fetchLeaderboard = async (period = 'daily') => {
    try {
      setLeaderboardLoading(true);
      const response = await api.get(`/api/leaderboard/leaderboard?period=${period}`);
      if (response.data.success) setLeaderboardData(response.data.leaderboard || []);
      else { setLeaderboardData([]); console.log('Liderlik verisi alınamadı:', response.data.error); }
    } catch (error) {
      const errorInfo = handleApiError(error);
      const msg = errorInfo.type === 'network' ? 'İnternet bağlantınızı kontrol edin.'
                : errorInfo.type === 'unauthorized' ? 'Liderlik verilerine erişim yetkiniz yok.'
                : errorInfo.message;
      console.error('Liderlik verileri alınamadı:', error);
      setLeaderboardData([]);
      setGameMessage({ type: 'info', text: 'Liderlik tablosu yüklenemedi. ' + msg });
    } finally { setLeaderboardLoading(false); }
  };

  useEffect(() => { if (sidebarContent === 'leaderboard') fetchLeaderboard(leaderboardPeriod); }, [sidebarContent, leaderboardPeriod]);

  const closeGameMessage = () => setGameMessage(null);

  const clearTimers = () => {
    if (anaSureTimerRef.current) { 
      clearInterval(anaSureTimerRef.current); 
      anaSureTimerRef.current = null; 
    }
    if (cevapSureTimerRef.current) { 
      clearInterval(cevapSureTimerRef.current); 
      cevapSureTimerRef.current = null; 
    }
    if (wordRevealTimerRef.current) { 
      clearTimeout(wordRevealTimerRef.current); 
      wordRevealTimerRef.current = null; 
    }
  };

  const showWordAndContinue = (kelime, callback) => {
    setRevealedWord(kelime);
    setShowWordReveal(true);
    wordRevealTimerRef.current = setTimeout(() => { 
      setShowWordReveal(false); 
      setRevealedWord(''); 
      callback(); 
    }, 3000);
  };

  // checkAchievements fonksiyonunu güvenli hale getir
  const checkAchievements = async (gameData) => {
  try {
    console.log('Achievement kontrolü yapılıyor:', gameData);
    
    // achievementManager'ın doğru fonksiyonunu kullan
    if (achievementManager && typeof achievementManager.checkAndPersist === 'function') {
      await achievementManager.checkAndPersist(user, gameData);
      console.log('✅ Achievement kontrolü tamamlandı');
    } else {
      console.warn('achievementManager veya checkAndPersist fonksiyonu bulunamadı');
    }
  } catch (error) {
    console.warn('Başarımlar kontrol edilirken hata:', error);
  }
};
  const oyunuBitir = async () => {
    try {
      clearTimers();
      const res = await api.post('/api/game/oyunu-bitir');
      const data = res?.data || {};
      const finalPuan = typeof data.puan === 'number' ? data.puan : (oyunDurumu?.puan || 0);
      setGameMessage({ 
        type: 'info', 
        text: data.mesaj || `Oyun bitti! Toplam puanınız: ${finalPuan}.` 
      });
      
      setOyunBasladi(false); 
      setOyunDurumu(null); 
      setTahminModu(false); 
      setTahmin(''); 
      setLoading(false);
      
      const gameData = { 
        correct_answers: data.correct_answers || oyunDurumu?.correct_count || 0, 
        total_questions: data.total_questions || oyunDurumu?.toplam_sorular || 0, 
        final_score: finalPuan 
      };
      
      await checkAchievements(gameData);
      setTimeout(() => refreshUserData(), 500);
    } catch (error) {
      const errorInfo = handleApiError(error);
      const msg = errorInfo.type === 'network' ? 'İnternet bağlantınızı kontrol edin.'
                : errorInfo.type === 'unauthorized' ? 'Oturumunuz sonlandırıldı. Lütfen tekrar giriş yapınız.'
                : errorInfo.message;
      console.error('Oyunu bitirirken hata:', error);
      setGameMessage({ type: 'failure', text: 'Oyun bitirilemedi. ' + msg });
    }
  };

  const oyunBaslat = async (opts = {}) => {
    if (loading) return; 
    closeGameMessage();
    try { 
      setLoading(true); 
      setOyunBasladi(true); 
      await api.post('/api/game/yeni-oyun', opts); 
      await sonrakiSoruGetir(); 
    } catch (error) { 
      setOyunBasladi(false); 
      const errorInfo = handleApiError(error); 
      const msg = errorInfo.type === 'network' ? 'İnternet bağlantınızı kontrol edin.' 
                : errorInfo.type === 'server' ? 'Sunucu hatası, lütfen daha sonra tekrar deneyin.' 
                : errorInfo.message; 
      setGameMessage({ type: 'failure', text: 'Oyun başlatılamadı. ' + msg }); 
    } finally { 
      setLoading(false); 
    }
  };

  const sonrakiSoruGetir = async () => {
    try {
      setTahminModu(false); 
      setTahmin(''); 
      clearTimers(); 
      closeGameMessage();
      
      const response = await api.post('/api/game/sonraki-soru');
      const data = response.data || {};
      
      if (data.oyun_bitti) { 
        const finalPuan = typeof data.puan === 'number' ? data.puan : (oyunDurumu?.puan || 0); 
        setGameMessage({ type: 'info', text: data.mesaj || `Oyun bitti! Toplam puanınız: ${finalPuan}.` }); 
        setOyunBasladi(false); 
        setOyunDurumu(null); 
        return; 
      }
      
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      const yeniDurum = { 
        ...oyunDurumu, 
        kelime_id: data.kelime_id, 
        kelime_gosterim: data.kelime_gosterim, 
        kalan_sure: data.kalan_sure, 
        puan: Number(data.puan ?? oyunDurumu?.puan ?? 0), 
        mevcut_harf_sayisi: Number(data.mevcut_harf_sayisi ?? (data.kelime_gosterim?.replace(/ /g, '').length) ?? oyunDurumu?.mevcut_harf_sayisi ?? 0), 
        soru_sayaci: Number(data.soru_sayaci ?? oyunDurumu?.soru_sayaci ?? 1), 
        soru_bilgisi: data.soru_bilgisi, 
        aciklama: data.aciklama, 
        ipuclari: data.ipuclari || [], 
        aciklanan_harfler: [], 
        kazanç: data.kazanç || (data.mevcut_harf_sayisi * 100) 
      };
      
      setOyunDurumu(yeniDurum);
      anaSureBaslat(data.kalan_sure ?? yeniDurum.kalan_sure ?? 0);
    } catch (error) { 
      const errorInfo = handleApiError(error); 
      const msg = errorInfo.type === 'network' ? 'İnternet bağlantınızı kontrol edin.' 
                : errorInfo.status === 401 ? 'Oturum süresi dolmuş. Lütfen tekrar giriş yapın.' 
                : errorInfo.message; 
      setGameMessage({ type: 'failure', text: 'Soru getirilemedi. ' + msg }); 
    }
  };

  const anaSureBaslat = (kalanSure) => {
    clearTimers();
    anaSureTimerRef.current = setInterval(() => {
      setOyunDurumu(prev => {
        if (!prev) { 
          clearInterval(anaSureTimerRef.current); 
          anaSureTimerRef.current = null; 
          return prev; 
        }
        const mevcut = typeof prev.kalan_sure === 'number' ? prev.kalan_sure : (kalanSure || 0);
        const yeniSure = mevcut - 1;
        if (yeniSure <= 0) { 
          clearInterval(anaSureTimerRef.current); 
          anaSureTimerRef.current = null; 
          setGameMessage({ type: 'failure', text: 'Süre doldu! Oyun sonlandırılıyor...' }); 
          oyunuBitir(); 
          return { ...prev, kalan_sure: 0 }; 
        }
        return { ...prev, kalan_sure: yeniSure };
      });
    }, 1000);
  };

  const harfAl = async () => {
    if (tahminModu || loading) return;
    try {
      setLoading(true);
      const response = await api.post('/api/game/harf-satin-al');
      const data = response.data || {};
      
      if (data.oyun_bitti) { 
        const finalPuan = typeof data.puan === 'number' ? data.puan : (oyunDurumu?.puan || 0); 
        clearTimers(); 
        setGameMessage({ type: 'info', text: data.mesaj || `Oyun bitti! Toplam puanınız: ${finalPuan}.` }); 
        setOyunBasladi(false); 
        setOyunDurumu(null); 
        setTahminModu(false); 
        setTahmin(''); 
        return; 
      }
      
      if (data.error) { 
        setGameMessage({ type: 'failure', text: data.error }); 
        return; 
      }
      
      if (data.otomatik_dogru) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setOyunDurumu(prev => ({ 
          ...prev, 
          kelime_gosterim: data.kelime_gosterim, 
          puan: Number(data.yeni_puan), 
          aciklanan_harfler: data.aciklanan_harfler || [], 
          harf_maliyet: Number(data.harf_maliyet) 
        }));
        setGameMessage({ type: 'success', text: 'Tüm harfler alındı.' });
        showWordAndContinue(data.kelime_gosterim?.replace(/ /g, '') || oyunDurumu?.aktif_kelime, () => { 
          sonrakiSoruGetir(); 
        });
        return;
      }
      
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setOyunDurumu(prev => ({ 
        ...prev, 
        kelime_gosterim: data.kelime_gosterim, 
        puan: Number(data.yeni_puan), 
        aciklanan_harfler: [...(prev?.aciklanan_harfler || []), data.aciklanan_pozisyon].filter(v => v !== undefined && v !== null), 
        harf_maliyet: Number(data.harf_maliyet), 
        kazanç: data.kazanç || ((prev?.kazanç || 0) - 100) 
      }));
    } catch (error) { 
      const errorInfo = handleApiError(error); 
      const msg = errorInfo.type === 'network' ? 'İnternet bağlantınızı kontrol edin.' 
                : errorInfo.status === 400 ? 'Harf alacak puanınız yok.' 
                : errorInfo.message; 
      setGameMessage({ type: 'failure', text: 'Harf alınamadı. ' + msg }); 
    } finally { 
      setLoading(false); 
    }
  };

  const butonaBasFonk = async () => {
    try {
      if (anaSureTimerRef.current) { 
        clearInterval(anaSureTimerRef.current); 
        anaSureTimerRef.current = null; 
      }
      const response = await api.post('/api/game/butona-bas');
      
      // API yanıtını kontrol et
      if (!response.data) {
        throw new Error('Geçersiz API yanıtı');
      }
      
      setTahminModu(true); 
      cevapSureBaslat();
      setOyunDurumu(prev => ({ 
        ...prev, 
        kelime_gosterim: response.data.kelime_gosterim, 
        kalan_sure: response.data.kalan_sure 
      }));
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 300);
    } catch (error) { 
      const errorInfo = handleApiError(error); 
      const msg = errorInfo.type === 'network' ? 'İnternet bağlantınızı kontrol edin.' 
                : errorInfo.message; 
      setGameMessage({ type: 'failure', text: 'Butona basılamadı. ' + msg }); 
    }
  };

  const cevapSureBaslat = () => {
    setCevapSuresi(30);
    if (cevapSureTimerRef.current) clearInterval(cevapSureTimerRef.current);
    cevapSureTimerRef.current = setInterval(() => {
      setCevapSuresi(prev => { 
        if (prev <= 1) { 
          clearInterval(cevapSureTimerRef.current); 
          tahminGonder(null, true); 
          return 0; 
        } 
        return prev - 1; 
      });
    }, 1000);
  };

  const tahminGonder = async (manuelTahmin = null, sureBitti = false) => {
    if (isSubmitting) return;
    const gonderilecekTahmin = manuelTahmin !== null ? manuelTahmin : tahmin;
    
    // Input validasyonu
    const cleanGuess = gonderilecekTahmin?.replace(/[<>]/g, '').trim();
    if (!cleanGuess && !sureBitti) { 
      setGameMessage({ type: 'info', text: 'Lütfen bir tahmin giriniz.' }); 
      return; 
    }
    
    try {
      setIsSubmitting(true);
      if (cevapSureTimerRef.current) { 
        clearInterval(cevapSureTimerRef.current); 
        cevapSureTimerRef.current = null; 
      }
      
      const response = await api.post('/api/game/tahmin-kontrol', { tahmin: cleanGuess });
      const data = response.data || {};
      
      if (data.dogru) soundManager.playCorrect(); 
      else soundManager.playWrong();
      
      if (data.oyun_bitti) { 
        const finalPuan = typeof data.puan === 'number' ? data.puan : (oyunDurumu?.puan || 0); 
        setGameMessage({ type: data.dogru ? 'success' : 'info', text: data.mesaj || `Oyun bitti! Toplam puanınız: ${finalPuan}.` }); 
        showWordAndContinue(data.dogru_kelime || oyunDurumu?.aktif_kelime, () => { 
          clearTimers(); 
          setOyunBasladi(false); 
          setOyunDurumu(null); 
          setTahmin(''); 
          setTahminModu(false); 
        }); 
        return; 
      }
      
      const dogruMu = !!data.dogru; 
      const efektifPuan = Number(data.efektif_puan || 0);
      
      // Local: aktif oyunun soru geçmişine bir kayıt ekle
      try {
        const resolvedWord = (data?.dogru_kelime) ? data.dogru_kelime : (oyunDurumu?.aktif_kelime || (oyunDurumu?.kelime_gosterim ? oyunDurumu.kelime_gosterim.replace(/ /g, '') : ''));
        const historyEntry = {
          word: resolvedWord.toString(),
          result: !!dogruMu,
          score: Number(efektifPuan || 0),
          timestamp: new Date().toISOString()
        };
        setOyunGecmisi(prev => [historyEntry, ...(Array.isArray(prev) ? prev : [])]);
      } catch (e) {
        console.warn('Oyun geçmişi güncellenemedi:', e);
      }
      
      if (dogruMu) setGameMessage({ type: 'success', text: `Tebrikler! +${efektifPuan} puan kazandınız! 🎉` });
      else { 
        const msg = data.mesaj || (sureBitti ? 'Süre doldu, yanlış sayıldı.' : 'Yanlış cevap.'); 
        setGameMessage({ type: 'failure', text: msg }); 
      }
      
      setTimeout(() => { sonrakiSoruGetir(); }, 1000);
    } catch (error) {
      const errorInfo = handleApiError(error);
      const msg = errorInfo.type === 'network' ? 'İnternet bağlantınızı kontrol edin.'
                : errorInfo.type === 'unauthorized' ? 'Oturumunuz sonlandırıldı. Lütfen tekrar giriş yapınız.'
                : errorInfo.message;
      console.error('Tahmin gönderilirken hata:', error);
      setGameMessage({ type: 'failure', text: 'Tahmin gönderilemedi. ' + msg });
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const mevcutPuanHesapla = () => { 
    if (!oyunDurumu) return 0; 
    // kazanç property'si yoksa, mevcut harf sayısına göre hesapla
    if (oyunDurumu.kazanç !== undefined) return oyunDurumu.kazanç;
    return ((oyunDurumu.mevcut_harf_sayisi - (oyunDurumu.aciklanan_harfler?.length || 0)) * 100);
  };

  useEffect(() => { 
    return () => clearTimers(); 
  }, []);

  // Listen for achievement notifications via EventBus
  useEffect(() => {
    const handleAchievementUnlocked = (achievement) => {
      if (achievement) {
        setRecentAchievements([achievement]);
        setShowAchievementNotification(true);
      }
    };

    EventBus.on('achievement:unlocked', handleAchievementUnlocked);
    
    return () => {
      EventBus.off('achievement:unlocked', handleAchievementUnlocked);
    };
  }, []);

  // Listen for admin settings changes and apply them live to active game
  useEffect(() => {
    const handleAdminSettingsUpdate = (newSettings) => {
      console.log('✅ Admin settings updated via EventBus, applying live changes:', newSettings);
      
      // If game is active, update game-related settings
      if (newSettings) {
        // Apply base_time_per_question if changed - update state for next question
        if (newSettings.base_time_per_question && typeof newSettings.base_time_per_question === 'number') {
          setCevapSuresi(newSettings.base_time_per_question);
          console.log('✅ Time per question updated to:', newSettings.base_time_per_question);
        }
        
        // Show feedback to user that settings were updated
        setGameMessage({
          type: 'info',
          text: '⚙️ Oyun ayarları güncellendi!',
          duration: 2000
        });
      }
    };

    EventBus.on('admin:settings-updated', handleAdminSettingsUpdate);
    
    return () => {
      EventBus.off('admin:settings-updated', handleAdminSettingsUpdate);
    };
  }, []);

  const SoundToggleButton = () => (
    <TouchableOpacity style={componentStyles.game.headerButton} onPress={toggleSound}>
      <Text style={componentStyles.game.headerButtonText}>{soundEnabled ? '🔊' : '🔇'}</Text>
    </TouchableOpacity>
  );

  const RenderSidebarContent = () => {
    if (!isDesktop) return null;
    return (
      <View style={[componentStyles.game.sidebar, { width: 320, marginLeft: 20, height: '100%' }]}>
        <View style={componentStyles.game.sidebarHeader}>
          <TouchableOpacity style={[componentStyles.game.sidebarTab, sidebarContent === 'stats' && componentStyles.game.sidebarTabActive]} onPress={() => setSidebarContent('stats')}>
            <Text style={componentStyles.game.sidebarTabText}>İstatistikler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[componentStyles.game.sidebarTab, sidebarContent === 'leaderboard' && componentStyles.game.sidebarTabActive]} onPress={() => setSidebarContent('leaderboard')}>
            <Text style={componentStyles.game.sidebarTabText}>Liderlik</Text>
          </TouchableOpacity>
        </View>

        <View style={componentStyles.game.sidebarContent}>
          {sidebarContent === 'stats' ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              <DifficultyIndicator user={user} />
              <GameStatsWidget user={user} oyunDurumu={oyunDurumu} />
              {oyunDurumu?.aciklanan_harfler?.length > 0 && (
                <View style={componentStyles.game.revealedSection}>
                  <Text style={componentStyles.game.revealedTitle}>Açılan Harfler</Text>
                  <View style={componentStyles.game.lettersGrid}>{oyunDurumu.aciklanan_harfler.map((harf, index) => (<View key={index} style={componentStyles.game.letterChip}><Text style={componentStyles.game.letterChipText}>{harf}</Text></View>))}</View>
                </View>
              )}
            </ScrollView>
          ) : (
            <View style={{ flex: 1 }}>
              <View style={componentStyles.game.leaderboardHeader}>
                <Text style={componentStyles.game.sidebarTitle}>Liderlik Tablosu</Text>
                <View style={componentStyles.game.periodSelector}>
                  <TouchableOpacity style={[componentStyles.game.periodButton, leaderboardPeriod === 'daily' && componentStyles.game.periodButtonActive]} onPress={() => setLeaderboardPeriod('daily')}><Text style={componentStyles.game.periodButtonText}>Günlük</Text></TouchableOpacity>
                  <TouchableOpacity style={[componentStyles.game.periodButton, leaderboardPeriod === 'weekly' && componentStyles.game.periodButtonActive]} onPress={() => setLeaderboardPeriod('weekly')}><Text style={componentStyles.game.periodButtonText}>Haftalık</Text></TouchableOpacity>
                  <TouchableOpacity style={[componentStyles.game.periodButton, leaderboardPeriod === 'monthly' && componentStyles.game.periodButtonActive]} onPress={() => setLeaderboardPeriod('monthly')}><Text style={componentStyles.game.periodButtonText}>Aylık</Text></TouchableOpacity>
                  <TouchableOpacity style={[componentStyles.game.periodButton, leaderboardPeriod === 'all' && componentStyles.game.periodButtonActive]} onPress={() => setLeaderboardPeriod('all')}><Text style={componentStyles.game.periodButtonText}>Tüm Zamanlar</Text></TouchableOpacity>
                </View>
              </View>
              {leaderboardLoading ? (
                <View style={componentStyles.game.leaderboardPlaceholder}><ActivityIndicator size="small" color={colors.primary} /><Text style={componentStyles.game.placeholderText}>Liderlik yükleniyor...</Text></View>
              ) : leaderboardData.length > 0 ? (
                <ScrollView style={componentStyles.game.leaderboardList} showsVerticalScrollIndicator={false}>
                  {leaderboardData.map((item, index) => (
                    <View key={item.user_id || index} style={[componentStyles.game.leaderboardItem, item.user_id === user?.id && componentStyles.game.currentUserItem]}>
                      <View style={componentStyles.game.leaderboardRank}><Text style={componentStyles.game.leaderboardRankText}>{index + 1}</Text></View>
                      <View style={componentStyles.game.leaderboardUser}><Text style={[componentStyles.game.leaderboardUsername, item.user_id === user?.id && componentStyles.game.currentUsername]}>{item.username || 'Anonim'}</Text><Text style={componentStyles.game.leaderboardStats}>{item.total_score || 0} puan • {item.games_played || 0} oyun</Text></View>
                      <View style={componentStyles.game.leaderboardScore}><Text style={componentStyles.game.leaderboardScoreText}>{item.avg_score ? item.avg_score.toFixed(0) : 0}</Text><Text style={componentStyles.game.leaderboardScoreLabel}>Ort.</Text></View>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <View style={componentStyles.game.leaderboardPlaceholder}><Text style={componentStyles.game.placeholderText}>{leaderboardPeriod === 'daily' ? 'Henüz günlük liderlik verisi yok' : leaderboardPeriod === 'weekly' ? 'Henüz haftalık liderlik verisi yok' : leaderboardPeriod === 'monthly' ? 'Henüz aylık liderlik verisi yok' : 'Henüz liderlik verisi yok'}</Text></View>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  if (!oyunBasladi) {
    return (
      <SafeAreaView style={globalStyles.safeArea}>
        <GameMessage message={gameMessage} onClose={closeGameMessage} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
          <GradientView colors={[colors.background, colors.card]} style={globalStyles.container}>
            <ScrollView ref={scrollViewRef} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 20, minHeight: Math.max(windowHeight, 600) }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps='handled'>
              <View style={[componentStyles.game.welcomeCard, { width: '95%', maxWidth: 500 }]}> 
                <Text style={componentStyles.game.welcomeTitle}>🎯 Kelime Oyunu</Text>
                <Text style={componentStyles.game.welcomeSubtitle}>Hoş geldin, {user?.username || 'Oyuncu'}!</Text>
                <View style={[componentStyles.game.userStats, isMobile && { flexDirection: 'row', gap: 8, justifyContent: 'space-between', marginBottom: 25 }]}>
                  <View style={[componentStyles.game.statCard, isMobile && { flex: 1, marginBottom: 0 }]}><Text style={componentStyles.game.statNumber}>{user?.statistics?.total_score || 0}</Text><Text style={componentStyles.game.statLabel}>Toplam Puan</Text></View>
                  <View style={[componentStyles.game.statCard, isMobile && { flex: 1, marginBottom: 0 }]}><Text style={componentStyles.game.statNumber}>{user?.statistics?.games_played || 0}</Text><Text style={componentStyles.game.statLabel}>Oynanan Oyun</Text></View>
                  <View style={[componentStyles.game.statCard, isMobile && { flex: 1, marginBottom: 0 }]}><Text style={componentStyles.game.statNumber}>{user?.statistics?.current_streak || 0}</Text><Text style={componentStyles.game.statLabel}>Mevcut Seri</Text></View>
                </View>
                <TouchableOpacity style={[componentStyles.game.startButton, isMobile && { width: '100%' }]} onPress={() => oyunBaslat()} disabled={loading}>
                  <GradientView colors={[colors.success, colors.gameSuccess]} style={componentStyles.game.gradientButton}>{loading ? <ActivityIndicator color='#fff' /> : (<><Text style={componentStyles.game.startButtonText}>🚀 Oyunu Başlat</Text><Text style={componentStyles.game.startButtonSubtext}>Yeni bir maceraya başla!</Text></>)}</GradientView>
                </TouchableOpacity>
                <View style={[componentStyles.game.quickStartGrid, isMobile && { flexDirection: 'column', gap: 10 }]}>
                  <TouchableOpacity style={componentStyles.game.quickStartButton} onPress={() => oyunBaslat({ question_count: 5 })}><Text style={componentStyles.game.quickStartEmoji}>⚡</Text><Text style={componentStyles.game.quickStartText}>5 Soru</Text><Text style={componentStyles.game.quickStartSubtext}>Hızlı Oyun</Text></TouchableOpacity>
                  <TouchableOpacity style={componentStyles.game.quickStartButton} onPress={() => oyunBaslat({ question_count: 10 })}><Text style={componentStyles.game.quickStartEmoji}>🔥</Text><Text style={componentStyles.game.quickStartText}>10 Soru</Text><Text style={componentStyles.game.quickStartSubtext}>Standart</Text></TouchableOpacity>
                  <TouchableOpacity style={componentStyles.game.quickStartButton} onPress={() => oyunBaslat({ question_count: 20 })}><Text style={componentStyles.game.quickStartEmoji}>💪</Text><Text style={componentStyles.game.quickStartText}>20 Soru</Text><Text style={componentStyles.game.quickStartSubtext}>Zorlu</Text></TouchableOpacity>
                </View>
                <View style={[componentStyles.game.bottomMenu, { flexDirection: 'column', gap: 10, width: '100%' }]}>
                  <View style={[componentStyles.game.buttonRow, { flexDirection: 'row', gap: 10, width: '100%' }]}>
                    <TouchableOpacity style={[componentStyles.game.menuButton, { flex: 1, minHeight: 50 }]} onPress={() => navigation.navigate('DailyTasks')}><Text style={componentStyles.game.menuButtonText}>📋 Görevler</Text></TouchableOpacity>
                    <TouchableOpacity style={[componentStyles.game.menuButton, { flex: 1, minHeight: 50 }]} onPress={() => navigation.navigate('Friends')}><Text style={componentStyles.game.menuButtonText}>👥 Arkadaşlar</Text></TouchableOpacity>
                  </View>
                  <View style={[componentStyles.game.buttonRow, { flexDirection: 'row', gap: 10, width: '100%' }]}>
                    <TouchableOpacity style={[componentStyles.game.menuButton, { flex: 1, minHeight: 50 }]} onPress={() => navigation.navigate('Messages')}><Text style={componentStyles.game.menuButtonText}>💬 Mesajlar</Text></TouchableOpacity>
                    <TouchableOpacity style={[componentStyles.game.menuButton, { flex: 1, minHeight: 50 }]} onPress={() => navigation.navigate('Achievements')}><Text style={componentStyles.game.menuButtonText}>🏅 Başarımlar</Text></TouchableOpacity>
                  </View>
                  <View style={[componentStyles.game.buttonRow, { flexDirection: 'row', gap: 10, width: '100%' }]}>
                    <TouchableOpacity style={[componentStyles.game.menuButton, { flex: 1, minHeight: 50 }]} onPress={() => navigation.navigate('Profile')}><Text style={componentStyles.game.menuButtonText}>👤 Profilim</Text></TouchableOpacity>
                    <TouchableOpacity style={[componentStyles.game.menuButton, { flex: 1, minHeight: 50 }]} onPress={() => navigation.navigate('Leaderboard')}><Text style={componentStyles.game.menuButtonText}>🏆 Liderlik</Text></TouchableOpacity>
                  </View>
                  <View style={[componentStyles.game.buttonRow, { flexDirection: 'row', gap: 10, width: '100%' }]}>
                    {user?.is_admin && (<TouchableOpacity style={[componentStyles.game.menuButton, { flex: 1, minHeight: 50 }]} onPress={() => navigation.navigate('AdminSettings')}><Text style={componentStyles.game.menuButtonText}>⚙️ Admin</Text></TouchableOpacity>)}
                    <TouchableOpacity style={[componentStyles.game.menuButton, componentStyles.game.logoutButton, { flex: user?.is_admin ? 1 : 2, minHeight: 50 }]} onPress={doLogout}><Text style={componentStyles.game.menuButtonText}>🚪 Çıkış</Text></TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>
          </GradientView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (loading || !oyunDurumu) {
    return (
      <SafeAreaView style={globalStyles.safeArea}>
        <GameMessage message={gameMessage} onClose={closeGameMessage} />
        <GradientView colors={[colors.background, colors.card]} style={globalStyles.centeredContainer}>
          <ActivityIndicator size='large' color={colors.textPrimary} />
          <Text style={[globalStyles.bodyText, { marginTop: 20 }]}>Oyun hazırlanıyor...</Text>
        </GradientView>
      </SafeAreaView>
    );
  }

  const mevcutKazanç = mevcutPuanHesapla();

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <GameMessage message={gameMessage} onClose={closeGameMessage} />
      {showAchievementNotification && recentAchievements[0] && (
        <AchievementNotification 
          achievement={recentAchievements[0]} 
          onHide={() => setShowAchievementNotification(false)} 
        />
      )}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column', width: '100%', maxWidth: 1400, alignSelf: 'center' }}>
          {isDesktop && <LeftSidebar isDesktop={isDesktop} oyunDurumu={oyunDurumu} kelimeIstatistikleri={kelimeIstatistikleri} performansAnalizi={performansAnalizi} oyunGecmisi={oyunGecmisi} basarimlar={basarimlar} />}
          <View style={{ flex: 1, flexDirection: 'column' }}>
            <GradientView colors={[colors.primary, colors.secondary]} style={componentStyles.game.header}>
              <View style={[componentStyles.game.headerContent, isMobile && { flexDirection: 'column', gap: 10, alignItems: 'flex-start' }]}>
                <View>
                  <Text style={componentStyles.game.headerTitle}>🎯 Akıllı Kelime Oyunu</Text>
                  <Text style={componentStyles.game.headerSubtitle}>{user?.username} • Soru #{oyunDurumu.soru_sayaci}</Text>
                </View>
                <View style={[componentStyles.game.headerActions, isMobile && { width: '100%', justifyContent: 'space-between' }]}>
                  <TouchableOpacity style={componentStyles.game.headerButton} onPress={() => navigation.navigate('Profile')}><Text style={componentStyles.game.headerButtonText}>👤</Text></TouchableOpacity>
                  <TouchableOpacity style={componentStyles.game.headerButton} onPress={() => navigation.navigate('Leaderboard')}><Text style={componentStyles.game.headerButtonText}>🏆</Text></TouchableOpacity>
                  {user?.is_admin && (<TouchableOpacity style={componentStyles.game.headerButton} onPress={() => navigation.navigate('AdminSettings')}><Text style={componentStyles.game.headerButtonText}>⚙️</Text></TouchableOpacity>)}
                  <TouchableOpacity style={[componentStyles.game.headerButton, componentStyles.game.headerButtonDanger]} onPress={oyunuBitir}><Text style={componentStyles.game.headerButtonText}>🔚</Text></TouchableOpacity>
                  <SoundToggleButton />
                </View>
              </View>
            </GradientView>

            <ScrollView ref={scrollViewRef} style={componentStyles.game.content} contentContainerStyle={{ flexGrow: 1, paddingBottom: keyboardHeight > 0 ? keyboardHeight + 100 : 120 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps='handled' onContentSizeChange={() => { if (tahminModu || keyboardHeight > 0) setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100); }}>
              {tahminModu && (<View style={componentStyles.game.timerWarning}><Text style={componentStyles.game.timerText}>⏰ {cevapSuresi}s KALDI</Text></View>)}
              <View style={componentStyles.game.statsContainer}>
                <DifficultyIndicator user={user} />
                <GameStatsWidget user={user} oyunDurumu={oyunDurumu} />
              </View>
              <View style={componentStyles.game.gameInfo}>
                <View style={[componentStyles.game.infoCards, isMobile && { flexDirection: 'row', gap: 8, justifyContent: 'space-between' }]}>
                  <View style={[componentStyles.game.infoCard, isMobile && { flex: 1 }]}><Text style={componentStyles.game.infoCardLabel}>SÜRE</Text><Text style={componentStyles.game.infoCardValue}>{Math.floor(oyunDurumu.kalan_sure)}s</Text></View>
                  <View style={[componentStyles.game.infoCard, isMobile && { flex: 1 }]}><Text style={componentStyles.game.infoCardLabel}>PUAN</Text><Text style={componentStyles.game.infoCardValue}>{oyunDurumu.puan}</Text></View>
                  <View style={[componentStyles.game.infoCard, isMobile && { flex: 1 }]}><Text style={componentStyles.game.infoCardLabel}>KAZANÇ</Text><Text style={componentStyles.game.infoCardValue}>+{Math.max(0, mevcutKazanç)}</Text></View>
                </View>
                <Text style={componentStyles.game.questionInfo}>{oyunDurumu.soru_bilgisi}</Text>
                <TouchableOpacity 
                  style={componentStyles.game.wordDisplay} 
                  onPress={() => !tahminModu && butonaBasFonk()}
                  activeOpacity={tahminModu ? 1 : 0.7}
                >
                  <Text style={[componentStyles.game.wordText, isMobile && { fontSize: 20, letterSpacing: 4 }]}>{oyunDurumu.kelime_gosterim}</Text>
                  {!tahminModu && <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 5 }}>Tahmin etmek için tıkla</Text>}
                </TouchableOpacity>
                <Text style={componentStyles.game.hintText}>{oyunDurumu.aciklama}</Text>
                {oyunDurumu?.aciklanan_harfler?.length > 0 && (
                  <View style={componentStyles.game.revealedSection}>
                    <Text style={componentStyles.game.revealedTitle}>Açılan Harfler</Text>
                    <View style={componentStyles.game.lettersGrid}>{oyunDurumu.aciklanan_harfler.map((harf, index) => (<View key={index} style={componentStyles.game.letterChip}><Text style={componentStyles.game.letterChipText}>{harf}</Text></View>))}</View>
                  </View>
                )}
              </View>

              <View style={[componentStyles.game.controls, isMobile && { paddingHorizontal: 10 }]}>
                {!tahminModu ? (
                  <View style={[componentStyles.game.controlButtons, isMobile && { flexDirection: 'column', gap: 10 }]}>
                    <TouchableOpacity style={[componentStyles.game.controlButton, isMobile && { width: '100%' }]} onPress={harfAl} disabled={loading}><GradientView colors={[colors.warning, colors.gameWarning]} style={componentStyles.game.gradientButtonSmall}><Text style={componentStyles.game.controlButtonText}>🔍 Harf Al</Text><Text style={componentStyles.game.controlButtonSubtext}>Soru Puanı -100 Puan</Text></GradientView></TouchableOpacity>
                    <TouchableOpacity style={[componentStyles.game.controlButton, isMobile && { width: '100%' }]} onPress={butonaBasFonk} disabled={loading}><GradientView colors={[colors.secondary, colors.gameSecondary]} style={componentStyles.game.gradientButtonSmall}><Text style={componentStyles.game.controlButtonText}>⏸️ Tahmin Et</Text><Text style={componentStyles.game.controlButtonSubtext}>30 Saniye</Text></GradientView></TouchableOpacity>
                  </View>
                ) : (
                  <View style={[componentStyles.game.guessMode, isMobile && { flexDirection: 'column', gap: 10 }]}>
                    <TextInput ref={tahminInputRef} style={[componentStyles.game.guessInput, isMobile && { width: '100%', fontSize: 16 }]} value={tahmin} onChangeText={setTahmin} placeholder='Kelimeyi tahmin edin...' placeholderTextColor={colors.textMuted} autoCapitalize='characters' autoCorrect={false} maxLength={oyunDurumu.mevcut_harf_sayisi || 10} onSubmitEditing={() => tahminGonder()} />
                    <TouchableOpacity style={[componentStyles.game.submitButton, isMobile && { width: '100%' }]} onPress={() => tahminGonder()} disabled={isSubmitting}><GradientView colors={[colors.success, colors.gameSuccess]} style={componentStyles.game.gradientButtonSmall}>{isSubmitting ? <ActivityIndicator color='#fff' /> : <Text style={componentStyles.game.submitButtonText}>✅ Gönder</Text>}</GradientView></TouchableOpacity>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
          {isDesktop && <RenderSidebarContent />}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default GameScreen;