// frontend/src/screens/AchievementsScreen.js
import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Platform,
  Animated,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../utils/colors';

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

// Tüm başarımlar - backend ile senkronize
const ALL_ACHIEVEMENTS = [
  { id: 'first_game', name: 'İlk Adım', description: 'İlk oyununu tamamla', icon: '🎮', requirement: 1 },
  { id: 'score_100', name: 'Yüzlük', description: '100 puan kazan', icon: '💯', requirement: 100 },
  { id: 'score_500', name: 'Beş Yüzlük', description: '500 puan kazan', icon: '🏆', requirement: 500 },
  { id: 'score_1000', name: 'Binlik', description: '1000 puan kazan', icon: '👑', requirement: 1000 },
  { id: 'games_10', name: 'Deneyimli', description: '10 oyun tamamla', icon: '⭐', requirement: 10 },
  { id: 'games_50', name: 'Uzman', description: '50 oyun tamamla', icon: '🌟', requirement: 50 },
  { id: 'games_100', name: 'Usta', description: '100 oyun tamamla', icon: '💫', requirement: 100 },
  { id: 'perfect_game', name: 'Mükemmeliyetçi', description: 'Bir oyunda tüm soruları doğru cevapla', icon: '✨', requirement: 1 },
  { id: 'streak_5', name: 'Seri Katil', description: '5 doğru cevap serisi yap', icon: '🔥', requirement: 5 },
  { id: 'streak_10', name: 'Durdurulamaz', description: '10 doğru cevap serisi yap', icon: '⚡', requirement: 10 },
  { id: 'fast_answer', name: 'Şimşek', description: '3 saniyede doğru cevap ver', icon: '⚡', requirement: 1 },
  { id: 'daily_player', name: 'Sadık Oyuncu', description: '7 gün üst üste oyna', icon: '📅', requirement: 7 },
];

const AchievementsScreen = ({ navigation }) => {
  const { user, refreshUserData } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userAchievements, setUserAchievements] = useState([]);
  const [userStats, setUserStats] = useState({});

  const loadAchievements = useCallback(async () => {
    try {
      const response = await api.get('/api/game/achievements');
      if (response.data.success) {
        setUserAchievements(response.data.achievements || []);
        setUserStats(response.data.stats || {});
      }
    } catch (error) {
      console.error('Başarımlar yüklenemedi:', error);
      // Fallback: kullanıcı verisinden al
      if (user?.achievements) {
        setUserAchievements(user.achievements);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadAchievements();
  }, [loadAchievements]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAchievements();
  };

  const getProgress = (achievement) => {
    const achievementId = achievement.id;
    const requirement = achievement.requirement;

    // Kullanıcı istatistiklerinden ilerleme hesapla
    switch (achievementId) {
      case 'first_game':
      case 'games_10':
      case 'games_50':
      case 'games_100':
        return Math.min(userStats.games_played || 0, requirement);
      case 'score_100':
      case 'score_500':
      case 'score_1000':
        return Math.min(userStats.total_score || 0, requirement);
      case 'streak_5':
      case 'streak_10':
        return Math.min(userStats.best_streak || 0, requirement);
      case 'daily_player':
        return Math.min(userStats.consecutive_days || 0, requirement);
      default:
        return 0;
    }
  };

  const isUnlocked = (achievementId) => {
    return userAchievements.includes(achievementId);
  };

  const AchievementCard = ({ achievement }) => {
    const unlocked = isUnlocked(achievement.id);
    const progress = getProgress(achievement);
    const progressPercentage = Math.min(100, (progress / achievement.requirement) * 100);

    return (
      <View style={[styles.achievementCard, unlocked && styles.achievementCardUnlocked]}>
        <View style={[styles.iconContainer, !unlocked && styles.iconContainerLocked]}>
          <Text style={[styles.achievementIcon, !unlocked && styles.achievementIconLocked]}>
            {achievement.icon}
          </Text>
          {unlocked && (
            <View style={styles.unlockedBadge}>
              <Text style={styles.unlockedBadgeText}>✓</Text>
            </View>
          )}
        </View>
        
        <View style={styles.achievementInfo}>
          <Text style={[styles.achievementName, !unlocked && styles.achievementNameLocked]}>
            {achievement.name}
          </Text>
          <Text style={[styles.achievementDescription, !unlocked && styles.achievementDescriptionLocked]}>
            {achievement.description}
          </Text>
          
          {!unlocked && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[styles.progressFill, { width: `${progressPercentage}%` }]} 
                />
              </View>
              <Text style={styles.progressText}>
                {progress}/{achievement.requirement}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={globalStyles.safeArea}>
        <View style={globalStyles.centeredContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textPrimary, marginTop: 10 }}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const unlockedCount = ALL_ACHIEVEMENTS.filter(a => isUnlocked(a.id)).length;
  const totalCount = ALL_ACHIEVEMENTS.length;
  const completionPercentage = Math.round((unlockedCount / totalCount) * 100);

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <GradientView colors={[colors.primary, colors.secondary]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Geri</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🏆 Başarımlar</Text>
          <View style={styles.headerStats}>
            <Text style={styles.headerStatsText}>{unlockedCount}/{totalCount}</Text>
          </View>
        </View>
      </GradientView>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* İlerleme Özeti */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>📊 Genel İlerleme</Text>
          <View style={styles.summaryProgressContainer}>
            <View style={styles.summaryProgressBar}>
              <View 
                style={[styles.summaryProgressFill, { width: `${completionPercentage}%` }]} 
              />
            </View>
            <Text style={styles.summaryProgressText}>{completionPercentage}%</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userStats.total_score || 0}</Text>
              <Text style={styles.statLabel}>Toplam Puan</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userStats.games_played || 0}</Text>
              <Text style={styles.statLabel}>Oyun</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userStats.best_streak || 0}</Text>
              <Text style={styles.statLabel}>En İyi Seri</Text>
            </View>
          </View>
        </View>

        {/* Kazanılmış Başarımlar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Kazanılmış ({unlockedCount})</Text>
          {ALL_ACHIEVEMENTS.filter(a => isUnlocked(a.id)).map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
          {unlockedCount === 0 && (
            <Text style={styles.emptyText}>Henüz başarım kazanmadın. Oyun oyna!</Text>
          )}
        </View>

        {/* Kilitli Başarımlar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔒 Kilitli ({totalCount - unlockedCount})</Text>
          {ALL_ACHIEVEMENTS.filter(a => !isUnlocked(a.id)).map((achievement) => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = {
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerStats: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 15,
  },
  headerStatsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
  summaryCard: {
    backgroundColor: colors.card,
    margin: 15,
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  summaryProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryProgressBar: {
    flex: 1,
    height: 12,
    backgroundColor: colors.border,
    borderRadius: 6,
    overflow: 'hidden',
    marginRight: 12,
  },
  summaryProgressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 6,
  },
  summaryProgressText: {
    color: colors.success,
    fontSize: 16,
    fontWeight: 'bold',
    minWidth: 45,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: 'bold',
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  achievementCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  achievementCardUnlocked: {
    borderWidth: 2,
    borderColor: colors.success,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    position: 'relative',
  },
  iconContainerLocked: {
    backgroundColor: colors.border,
  },
  achievementIcon: {
    fontSize: 30,
  },
  achievementIconLocked: {
    opacity: 0.5,
  },
  unlockedBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockedBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  achievementNameLocked: {
    color: colors.textMuted,
  },
  achievementDescription: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  achievementDescriptionLocked: {
    color: colors.textMuted,
    opacity: 0.7,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressText: {
    color: colors.textMuted,
    fontSize: 11,
    minWidth: 40,
    textAlign: 'right',
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
};

export default AchievementsScreen;
