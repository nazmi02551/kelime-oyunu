// frontend/src/screens/ProfileScreen.js - OPTİMİZE EDİLMİŞ VERSİYON
import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  Platform,
  StyleSheet,
  Dimensions
} from 'react-native';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../utils/colors';
import { responsiveFont, responsivePadding } from '../utils/dimensions';
import soundManager from '../services/SoundManager';
import { handleApiError } from '../utils/errorHandler';
import EventBus from '../services/EventBus';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';

const { width, height } = Dimensions.get('window');

// GradientView bileşeni - Web ve Mobile uyumlu
const GradientView = ({ colors, style, children }) => {
  if (Platform.OS === 'web') {
    return (
      <View style={[style, { 
        background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
        width: '100%'
      }]}>
        {children}
      </View>
    );
  }
  
  const { LinearGradient } = require('expo-linear-gradient');
  return (
    <LinearGradient colors={colors} style={style}>
      {children}
    </LinearGradient>
  );
};

// AdaptiveDifficultyCard bileşeni
const AdaptiveDifficultyCard = ({ user }) => {
  const adaptive = user?.adaptive_difficulty || {};
  const performanceScore = adaptive.performance_score || 0.5;
  const currentModifier = adaptive.current_modifier || 1.0;

  const getDifficultyInfo = () => {
    if (currentModifier > 1.3) return { level: 'UZMAN', color: colors.gameDanger, emoji: '🎯', description: 'Mükemmel performans!' };
    if (currentModifier > 1.0) return { level: 'İLERİ', color: colors.gameWarning, emoji: '⚡', description: 'Çok iyi gidiyorsun!' };
    if (currentModifier > 0.7) return { level: 'ORTA', color: colors.gameSuccess, emoji: '🔥', description: 'Gayet iyi devam et!' };
    return { level: 'BAŞLANGIÇ', color: colors.gameSecondary, emoji: '🌱', description: 'Harika başlangıç!' };
  };

  const difficulty = getDifficultyInfo();

  return (
    <View style={styles.adaptiveCard}>
      <View style={styles.adaptiveHeader}>
        <Text style={styles.adaptiveTitle}>🎯 Zorluk Seviyesi</Text>
        <Text style={[styles.adaptiveLevel, { color: difficulty.color }]}>
          {difficulty.emoji} {difficulty.level}
        </Text>
      </View>
      
      <Text style={styles.adaptiveDescription}>
        {difficulty.description}
      </Text>

      <View style={styles.progressSection}>
        <View style={styles.progressLabels}>
          <Text style={styles.progressLabel}>Performans Seviyesi</Text>
          <Text style={styles.progressPercentage}>
            %{(performanceScore * 100).toFixed(0)}
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${performanceScore * 100}%`,
                backgroundColor: difficulty.color
              }
            ]} 
          />
        </View>
      </View>

      <View style={styles.modifierContainer}>
        <View style={styles.modifierItem}>
          <Text style={styles.modifierLabel}>Zorluk Çarpanı</Text>
          <Text style={styles.modifierValue}>{currentModifier.toFixed(2)}x</Text>
        </View>
        <View style={styles.modifierItem}>
          <Text style={styles.modifierLabel}>Son Güncelleme</Text>
          <Text style={styles.modifierValue}>
            {adaptive.last_updated ? new Date(adaptive.last_updated).toLocaleDateString('tr-TR') : 'Yeni'}
          </Text>
        </View>
      </View>
    </View>
  );
};

// RecentGamesCard bileşeni
const RecentGamesCard = ({ user }) => {
  const [recentGames, setRecentGames] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRecentGames();
  }, []);

  const fetchRecentGames = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/game/recent-games');
      setRecentGames(res.data.games || []);
    } catch (error) {
      const errorInfo = handleApiError(error);
      const msg = errorInfo.type === 'network' ? 'İnternet bağlantınızı kontrol edin.'
                : errorInfo.type === 'unauthorized' ? 'Oturumunuz sonlandırıldı.'
                : errorInfo.message;
      console.warn('Recent games fetch error:', error);
      setRecentGames([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Son Oyunlar</Text>
        <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>🎮 Son Oyunlar</Text>
      
      {recentGames.length === 0 ? (
        <Text style={styles.emptyText}>Henüz oyun oynamadınız</Text>
      ) : (
        <View style={styles.gamesList}>
          {recentGames.slice(0, 5).map((game, index) => (
            <View key={game._id || index} style={styles.gameItem}>
              <View style={styles.gameInfo}>
                <Text style={styles.gameDate}>
                  {new Date(game.end_time).toLocaleDateString('tr-TR')}
                </Text>
                <Text style={styles.gameScore}>
                  {game.final_score} puan
                </Text>
              </View>
              <View style={[
                styles.gameStatus,
                { backgroundColor: game.final_score > 0 ? colors.success : colors.error }
              ]}>
                <Text style={styles.gameStatusText}>
                  {game.final_score > 0 ? '✓' : '✗'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

// Full per-question answer history (profile)
const FullAnswerHistoryCard = () => {
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await api.get('/api/game/game-history?limit=50');
      setHistory(res.data.games || []);
    } catch (error) {
      const errorInfo = handleApiError(error);
      const msg = errorInfo.type === 'network' ? 'İnternet bağlantınızı kontrol edin.'
                : errorInfo.type === 'unauthorized' ? 'Oturumunuz sonlandırıldı.'
                : errorInfo.message;
      console.warn('Game history fetch error:', error);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>📜 Kelime Cevap Geçmişi</Text>
      {loadingHistory ? (
        <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
      ) : history.length === 0 ? (
        <Text style={styles.emptyText}>Henüz kayıt yok</Text>
      ) : (
        <View style={styles.historyList}>
          {history.map((item, idx) => (
            <View key={item._id || idx} style={styles.historyRow}>
              <View style={styles.historyMain}>
                <Text style={styles.historyWord}>{item.word || item.kelime || item.word_text}</Text>
                <Text style={[styles.historyResult, item.result ? styles.historyCorrect : styles.historyWrong]}>{item.result ? '✅' : '❌'}</Text>
              </View>
              <View style={styles.historyMeta}>
                <Text style={styles.historyScore}>{item.score ?? item.puan ?? 0} puan</Text>
                <Text style={styles.historyTime}>{item.timestamp ? new Date(item.timestamp).toLocaleString('tr-TR') : (item.end_time ? new Date(item.end_time).toLocaleString('tr-TR') : '')}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

// AchievementCard bileşeni
const AchievementCard = ({ user }) => {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAchievements = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/game/user-achievements');
      setAchievements(res.data.achievements || []);
    } catch (e) {
      const errorInfo = handleApiError(e);
      const msg = errorInfo.type === 'network' ? 'İnternet bağlantınızı kontrol edin.'
                : errorInfo.type === 'unauthorized' ? 'Oturumunuz sonlandırıldı.'
                : errorInfo.message;
      console.warn('Achievements fetch error', e);
      setAchievements([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAchievements();
    const off = EventBus.on('achievements:updated', () => fetchAchievements());
    return () => off();
  }, [user]);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>🏆 Başarımlar</Text>
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
      ) : (
        <View style={styles.achievementsGrid}>
          {achievements.map((achievement) => (
            <View 
              key={achievement.id} 
              style={[
                styles.achievementItem,
                !achievement.unlocked && styles.achievementLocked
              ]}
            >
              <Text style={styles.achievementIcon}>
                {achievement.unlocked ? achievement.icon : '🔒'}
              </Text>
              <Text style={styles.achievementName}>
                {achievement.name}
              </Text>
              <Text style={styles.achievementDesc}>
                {achievement.description}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

// ProfileScreen ana bileşeni
const ProfileScreen = ({ navigation }) => {
  const { user, setUser } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState({});
  const [preferences, setPreferences] = useState({});
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (user) {
      setProfile(user?.profile || {});
      setPreferences(user?.preferences || {
        difficulty_preference: 'static',
        categories: [],
        theme: 'dark',
        sound_enabled: true,
        language: 'tr',
        difficulty_level: 'medium',
        preferred_word_length: 5
      });
    }
  }, [user]);

  // Read persisted sound preference from SoundManager/AsyncStorage on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const enabled = await soundManager.getEnabled();
        if (!mounted) return;
        setPreferences(prev => ({ ...(prev || {}), sound_enabled: !!enabled }));
      } catch (e) {
        // ignore
      }
      // load persisted preferences if present
      try {
        const raw = await AsyncStorage.getItem('preferences');
        if (raw) {
          const saved = JSON.parse(raw);
          if (mounted) setPreferences(prev => ({ ...(prev || {}), ...saved }));
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await api.get('/api/auth/me');
      if (res.data && res.data.user) {
        setUser(res.data.user);
      }
    } catch (error) {
      const errorInfo = handleApiError(error);
      const msg = errorInfo.type === 'network' ? 'İnternet bağlantınızı kontrol edin.'
                : errorInfo.type === 'unauthorized' ? 'Oturumunuz sonlandırıldı. Lütfen tekrar giriş yapınız.'
                : errorInfo.message;
      console.warn('Profil yenileme hatası:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      const res = await api.post('/api/auth/update-profile', { 
        profile, 
        preferences 
      });
      
      if (res.data && res.data.user) {
        setUser(res.data.user);
        // persist preferences locally
        try {
          await AsyncStorage.setItem('preferences', JSON.stringify(preferences || {}));
        } catch (e) {
          // ignore storage errors
        }
        Alert.alert('Başarılı', 'Profil bilgileriniz güncellendi.');
      } else {
        Alert.alert('Hata', 'Güncelleme başarısız.');
      }
    } catch (err) {
      const errorInfo = handleApiError(err);
      const msg = errorInfo.type === 'network' ? 'İnternet bağlantınızı kontrol edin.'
                : errorInfo.type === 'unauthorized' ? 'Oturumunuz sonlandırıldı. Lütfen tekrar giriş yapınız.'
                : errorInfo.status === 400 ? 'Lütfen formu doğru şekilde doldurunuz.'
                : errorInfo.message;
      Alert.alert('Hata', msg);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={[globalStyles.safeArea, styles.fullScreenContainer]}>
        <View style={[globalStyles.centeredContainer, styles.fullScreenContent]}>
          <Text style={globalStyles.title}>Kullanıcı bilgisi bulunamadı</Text>
          <TouchableOpacity
            style={[globalStyles.button, globalStyles.buttonPrimary, { marginTop: 20 }]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={globalStyles.buttonText}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const userStats = user.statistics || {};

  return (
    <SafeAreaView style={[globalStyles.safeArea, styles.fullScreenContainer]}>
      <ScrollView 
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <GradientView 
          colors={[colors.primary, colors.secondary]} 
          style={styles.header}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.username?.charAt(0).toUpperCase() || 'K'}
            </Text>
          </View>
          <Text style={styles.username}>{user.username || 'Kullanıcı'}</Text>
          <Text style={styles.email}>{user.email || ''}</Text>
          
          {/* Stats Overview */}
          <View style={styles.stats}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {userStats.total_score || 0}
              </Text>
              <Text style={styles.statLabel}>Toplam Puan</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {userStats.games_played || 0}
              </Text>
              <Text style={styles.statLabel}>Oynanan</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {userStats.current_streak || 0}
              </Text>
              <Text style={styles.statLabel}>Seri</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {userStats.average_score_per_game ? userStats.average_score_per_game.toFixed(0) : 0}
              </Text>
              <Text style={styles.statLabel}>Ortalama</Text>
            </View>
          </View>
        </GradientView>

        {/* Tab Navigation */}
        <View style={styles.tabs}>
          <TouchableOpacity 
            style={[
              styles.tab,
              activeTab === 'profile' && styles.tabActive
            ]}
            onPress={() => setActiveTab('profile')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'profile' && styles.tabTextActive
            ]}>
              Profil
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.tab,
              activeTab === 'stats' && styles.tabActive
            ]}
            onPress={() => setActiveTab('stats')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'stats' && styles.tabTextActive
            ]}>
              İstatistikler
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.tab,
              activeTab === 'settings' && styles.tabActive
            ]}
            onPress={() => setActiveTab('settings')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'settings' && styles.tabTextActive
            ]}>
              Ayarlar
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content Based on Active Tab */}
        <View style={styles.content}>
          {activeTab === 'profile' && (
            <>
              {/* Hızlı Erişim Butonları */}
              <View style={styles.quickAccessContainer}>
                <TouchableOpacity 
                  style={styles.quickAccessButton}
                  onPress={() => navigation.navigate('DailyTasks')}
                >
                  <Text style={styles.quickAccessIcon}>📋</Text>
                  <Text style={styles.quickAccessText}>Günlük Görevler</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.quickAccessButton}
                  onPress={() => navigation.navigate('Friends')}
                >
                  <Text style={styles.quickAccessIcon}>👥</Text>
                  <Text style={styles.quickAccessText}>Arkadaşlar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.quickAccessButton}
                  onPress={() => navigation.navigate('Achievements')}
                >
                  <Text style={styles.quickAccessIcon}>🏆</Text>
                  <Text style={styles.quickAccessText}>Başarımlar</Text>
                </TouchableOpacity>
              </View>

              <AdaptiveDifficultyCard user={user} />
              <RecentGamesCard user={user} />
              <FullAnswerHistoryCard />
              <AchievementCard user={user} />
            </>
          )}

          {activeTab === 'stats' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>📊 Detaylı İstatistikler</Text>
              
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statItemValue}>
                    {userStats.total_correct_answers || 0}
                  </Text>
                  <Text style={styles.statItemLabel}>Doğru Cevap</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statItemValue}>
                    {userStats.total_wrong_answers || 0}
                  </Text>
                  <Text style={styles.statItemLabel}>Yanlış Cevap</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statItemValue}>
                    {userStats.longest_streak || 0}
                  </Text>
                  <Text style={styles.statItemLabel}>En Uzun Seri</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statItemValue}>
                    {userStats.games_played ? 
                      Math.round(((userStats.total_correct_answers || 0) / 
                      ((userStats.total_correct_answers || 0) + (userStats.total_wrong_answers || 0) || 1)) * 100) : 0}%
                  </Text>
                  <Text style={styles.statItemLabel}>Başarı Oranı</Text>
                </View>
              </View>

              {/* Performance Chart Placeholder */}
              <View style={styles.chartPlaceholder}>
                <Text style={styles.chartTitle}>Performans Geçmişi</Text>
                <Text style={styles.chartSubtitle}>
                  Performans verileri yakında eklenecek
                </Text>
              </View>
            </View>
          )}

          {activeTab === 'settings' && (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>👤 Kişisel Bilgiler</Text>
                
                <View style={styles.form}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Kullanıcı Adı</Text>
                    <TextInput
                      style={styles.input}
                      value={user.username || ''}
                      editable={false}
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>E-posta</Text>
                    <TextInput
                      style={styles.input}
                      value={user.email || ''}
                      editable={false}
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Yaş Grubu</Text>
                    <TextInput
                      placeholder="Ör: 25-34"
                      style={styles.input}
                      value={profile.age_group || ''}
                      onChangeText={v => setProfile({...profile, age_group: v})}
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Eğitim Durumu</Text>
                    <TextInput
                      placeholder="Ör: lisans, yüksek lisans"
                      style={styles.input}
                      value={profile.education_level || ''}
                      onChangeText={v => setProfile({...profile, education_level: v})}
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Konum</Text>
                    <TextInput
                      placeholder="Şehir, Ülke"
                      style={styles.input}
                      value={profile.location || ''}
                      onChangeText={v => setProfile({...profile, location: v})}
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>⚙️ Tercihler</Text>
                
                <View style={styles.preferences}>
                  <View style={styles.preferenceItem}>
                    <Text style={styles.preferenceLabel}>Zorluk Modu</Text>
                    <View style={styles.preferenceOptions}>
                      <TouchableOpacity
                        style={[
                          styles.preferenceOption,
                          preferences.difficulty_preference === 'static' && 
                          styles.preferenceOptionActive
                        ]}
                        onPress={() => setPreferences({...preferences, difficulty_preference: 'static'})}
                      >
                        <Text style={[
                          styles.preferenceOptionText,
                          preferences.difficulty_preference === 'static' && 
                          styles.preferenceOptionTextActive
                        ]}>
                          Sabit
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.preferenceOption,
                          preferences.difficulty_preference === 'adaptive' && 
                          styles.preferenceOptionActive
                        ]}
                        onPress={() => setPreferences({...preferences, difficulty_preference: 'adaptive'})}
                      >
                        <Text style={[
                          styles.preferenceOptionText,
                          preferences.difficulty_preference === 'adaptive' && 
                          styles.preferenceOptionTextActive
                        ]}>
                          Uyarlanabilir
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.preferenceItem}>
                    <Text style={styles.preferenceLabel}>Ses Efektleri</Text>
                    <TouchableOpacity
                      style={[
                        styles.toggle,
                        preferences.sound_enabled && styles.toggleActive
                      ]}
                      onPress={async () => {
                        const newVal = !preferences.sound_enabled;
                        setPreferences({...preferences, sound_enabled: newVal});
                        try {
                          await soundManager.setEnabled(newVal);
                        } catch (e) {
                          console.warn('Ses tercihi atanamadı', e);
                        }
                      }}
                    >
                      <Text style={styles.toggleText}>
                        {preferences.sound_enabled ? 'Açık' : 'Kapalı'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.preferenceItem}>
                    <Text style={styles.preferenceLabel}>Dil</Text>
                    <View style={styles.pickerWrap}>
                      <Picker
                        selectedValue={preferences.language}
                        onValueChange={(val) => setPreferences({...preferences, language: val})}
                        style={styles.picker}
                        itemStyle={{ color: colors.textPrimary }}
                      >
                        <Picker.Item label="Türkçe" value="tr" />
                        <Picker.Item label="English" value="en" />
                        <Picker.Item label="Español" value="es" />
                      </Picker>
                    </View>
                  </View>

                  <View style={styles.preferenceItem}>
                    <Text style={styles.preferenceLabel}>Zorluk Seviyesi (Tercih)</Text>
                    <View style={styles.pickerWrap}>
                      <Picker
                        selectedValue={preferences.difficulty_level}
                        onValueChange={(val) => setPreferences({...preferences, difficulty_level: val})}
                        style={styles.picker}
                        itemStyle={{ color: colors.textPrimary }}
                      >
                        <Picker.Item label="Kolay" value="easy" />
                        <Picker.Item label="Orta" value="medium" />
                        <Picker.Item label="Zor" value="hard" />
                      </Picker>
                    </View>
                  </View>

                  <View style={styles.preferenceItem}>
                    <Text style={styles.preferenceLabel}>Tercih Edilen Kelime Uzunluğu</Text>
                    <View style={styles.pickerWrap}>
                      <Picker
                        selectedValue={preferences.preferred_word_length}
                        onValueChange={(val) => setPreferences({...preferences, preferred_word_length: val})}
                        style={styles.picker}
                        itemStyle={{ color: colors.textPrimary }}
                      >
                        <Picker.Item label="4 harf" value={4} />
                        <Picker.Item label="5 harf" value={5} />
                        <Picker.Item label="6 harf" value={6} />
                        <Picker.Item label="7+ harf" value={7} />
                      </Picker>
                    </View>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveProfile}
                disabled={loading}
              >
                <GradientView
                  colors={[colors.success, colors.gameSuccess]}
                  style={styles.gradientButton}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Değişiklikleri Kaydet</Text>
                  )}
                </GradientView>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Stiller
const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    width: '100%',
    minHeight: height,
    backgroundColor: colors.background,
  },
  fullScreenContent: {
    minHeight: height,
    width: '100%',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: responsivePadding(20),
    ...Platform.select({
      web: {
        minHeight: '100vh',
      },
    }),
  },
  // Hızlı Erişim Butonları
  quickAccessContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  quickAccessButton: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickAccessIcon: {
    fontSize: 28,
    marginBottom: 5,
  },
  quickAccessText: {
    color: colors.textPrimary,
    fontSize: responsiveFont(11),
    fontWeight: '600',
    textAlign: 'center',
  },
  header: {
    paddingVertical: responsivePadding(20),
    alignItems: 'center',
    width: '100%',
    ...Platform.select({
      web: {
        minHeight: height * 0.35,
      },
    }),
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: {
    fontSize: responsiveFont(32),
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  username: {
    fontSize: responsiveFont(24),
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 5,
    textAlign: 'center',
    width: '100%',
  },
  email: {
    fontSize: responsiveFont(16),
    color: colors.textSecondary,
    textAlign: 'center',
    width: '100%',
  },
  stats: {
    flexDirection: 'row',
    padding: responsivePadding(20),
    gap: 10,
    width: '100%',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    padding: responsivePadding(15),
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 80,
    maxWidth: 120,
    ...Platform.select({
      web: {
        minWidth: 90,
        maxWidth: 130,
      },
    }),
  },
  statNumber: {
    fontSize: responsiveFont(20),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: responsiveFont(12),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: responsivePadding(20),
    marginTop: responsivePadding(10),
    borderRadius: 10,
    padding: 5,
    width: '100%',
    ...Platform.select({
      web: {
        maxWidth: 600,
        alignSelf: 'center',
      },
    }),
  },
  tab: {
    flex: 1,
    paddingVertical: responsivePadding(12),
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: responsiveFont(14),
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  content: {
    padding: responsivePadding(15),
    flex: 1,
    width: '100%',
    ...Platform.select({
      web: {
        maxWidth: 800,
        alignSelf: 'center',
      },
    }),
  },
  card: {
    backgroundColor: colors.surface,
    padding: responsivePadding(20),
    borderRadius: 12,
    marginBottom: 15,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      },
    }),
  },
  cardTitle: {
    fontSize: responsiveFont(18),
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 15,
    width: '100%',
  },
  // Adaptive Difficulty Card Styles
  adaptiveCard: {
    backgroundColor: colors.surface,
    padding: responsivePadding(20),
    borderRadius: 12,
    marginBottom: 15,
    width: '100%',
  },
  adaptiveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  adaptiveTitle: {
    fontSize: responsiveFont(16),
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  adaptiveLevel: {
    fontSize: responsiveFont(14),
    fontWeight: 'bold',
  },
  adaptiveDescription: {
    fontSize: responsiveFont(14),
    color: colors.textSecondary,
    marginBottom: 15,
    textAlign: 'center',
    width: '100%',
  },
  progressSection: {
    marginBottom: 15,
    width: '100%',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    width: '100%',
  },
  progressLabel: {
    fontSize: responsiveFont(12),
    color: colors.textSecondary,
  },
  progressPercentage: {
    fontSize: responsiveFont(12),
    fontWeight: 'bold',
    color: colors.primary,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.card,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  modifierContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modifierItem: {
    alignItems: 'center',
  },
  modifierLabel: {
    fontSize: responsiveFont(12),
    color: colors.textSecondary,
    marginBottom: 4,
  },
  modifierValue: {
    fontSize: responsiveFont(14),
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  // Recent Games Styles
  emptyText: {
    fontSize: responsiveFont(14),
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    width: '100%',
  },
  gamesList: {
    gap: 10,
    width: '100%',
  },
  gameItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: responsivePadding(12),
    borderRadius: 8,
    width: '100%',
  },
  gameInfo: {
    flex: 1,
  },
  gameDate: {
    fontSize: responsiveFont(12),
    color: colors.textSecondary,
    marginBottom: 4,
  },
  gameScore: {
    fontSize: responsiveFont(14),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  gameStatus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameStatusText: {
    fontSize: responsiveFont(12),
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  // Achievements Styles
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
  },
  achievementItem: {
    width: '48%',
    backgroundColor: colors.card,
    padding: responsivePadding(15),
    borderRadius: 10,
    alignItems: 'center',
    ...Platform.select({
      web: {
        minWidth: 140,
      },
    }),
  },
  achievementLocked: {
    opacity: 0.5,
  },
  achievementIcon: {
    fontSize: responsiveFont(24),
    marginBottom: 8,
  },
  achievementName: {
    fontSize: responsiveFont(14),
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  achievementDesc: {
    fontSize: responsiveFont(12),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Stats Tab Styles
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
  },
  statItem: {
    width: '48%',
    backgroundColor: colors.card,
    padding: responsivePadding(15),
    borderRadius: 10,
    alignItems: 'center',
    ...Platform.select({
      web: {
        minWidth: 140,
      },
    }),
  },
  statItemValue: {
    fontSize: responsiveFont(20),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
  },
  statItemLabel: {
    fontSize: responsiveFont(12),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  chartPlaceholder: {
    backgroundColor: colors.card,
    padding: responsivePadding(20),
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
    width: '100%',
  },
  chartTitle: {
    fontSize: responsiveFont(16),
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
    width: '100%',
    textAlign: 'center',
  },
  chartSubtitle: {
    fontSize: responsiveFont(14),
    color: colors.textSecondary,
    textAlign: 'center',
    width: '100%',
  },
  // Settings Tab Styles
  form: {
    gap: 15,
    width: '100%',
  },
  inputGroup: {
    gap: 8,
    width: '100%',
  },
  label: {
    fontSize: responsiveFont(14),
    fontWeight: '600',
    color: colors.textPrimary,
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.cardLight,
    padding: responsivePadding(12),
    borderRadius: 8,
    fontSize: responsiveFont(16),
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    width: '100%',
  },
  preferences: {
    gap: 20,
    width: '100%',
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  preferenceLabel: {
    fontSize: responsiveFont(14),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  preferenceOptions: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 4,
  },
  preferenceOption: {
    paddingHorizontal: responsivePadding(12),
    paddingVertical: responsivePadding(8),
    borderRadius: 6,
  },
  preferenceOptionActive: {
    backgroundColor: colors.primary,
  },
  preferenceOptionText: {
    fontSize: responsiveFont(12),
    color: colors.textSecondary,
  },
  preferenceOptionTextActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  toggle: {
    backgroundColor: colors.card,
    paddingHorizontal: responsivePadding(12),
    paddingVertical: responsivePadding(8),
    borderRadius: 8,
  },
  toggleActive: {
    backgroundColor: colors.success,
  },
  toggleText: {
    fontSize: responsiveFont(12),
    color: colors.textSecondary,
    fontWeight: '600',
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
    width: '100%',
  },
  gradientButton: {
    paddingVertical: responsivePadding(15),
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    fontSize: responsiveFont(16),
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  // Full answer history styles
  historyList: {
    width: '100%',
    gap: 8,
  },
  historyRow: {
    backgroundColor: colors.card,
    padding: responsivePadding(12),
    borderRadius: 8,
    marginBottom: 8,
    width: '100%',
  },
  historyMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  historyWord: {
    fontSize: responsiveFont(14),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  historyResult: {
    fontSize: responsiveFont(14),
    fontWeight: '700',
  },
  historyCorrect: {
    color: colors.success,
  },
  historyWrong: {
    color: colors.error,
  },
  historyMeta: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  historyScore: {
    fontSize: responsiveFont(12),
    color: colors.textSecondary,
  },
  historyTime: {
    fontSize: responsiveFont(12),
    color: colors.textSecondary,
  },
});

export default ProfileScreen;