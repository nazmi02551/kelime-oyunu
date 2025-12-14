// frontend/src/screens/LeaderboardScreen.js - SON VE ÇALIŞAN HALİ

import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Animated,
  Platform,
  SafeAreaView,
  useWindowDimensions
} from 'react-native';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../utils/colors';
import EventBus from '../services/EventBus';
import { responsiveFont, responsivePadding, responsiveSize } from '../utils/dimensions';

// GradientView bileşeni - useNativeDriver hatası için düzeltildi
const GradientView = ({ colors: gradientColors, style, children }) => {
  if (Platform.OS === 'web') {
    return (
      <View style={[style, { background: `linear-gradient(135deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 100%)` }]}>
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

const LeaderboardScreen = () => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isDesktop = screenWidth > 768;

  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('all');
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [recentFinishers, setRecentFinishers] = useState([]);
  const [topPlayers, setTopPlayers] = useState([]);
  const [stats, setStats] = useState({});
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [error, setError] = useState(null);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    fetchLeaderboardData();
  }, [period, activeTab]);

  // Listen for leaderboard updates via EventBus (when someone finishes a game)
  useEffect(() => {
    const handleLeaderboardUpdate = () => {
      console.log('Leaderboard updated via EventBus, refreshing...');
      fetchLeaderboardData();
    };

    EventBus.on('leaderboard:updated', handleLeaderboardUpdate);

    return () => {
      EventBus.off('leaderboard:updated', handleLeaderboardUpdate);
    };
  }, [period, activeTab]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(1);
    }
  }, [leaderboardData, recentFinishers, topPlayers]);

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      if (activeTab === 'leaderboard') {
        const params = { period };
        const res = await api.get('/api/leaderboard/leaderboard', { params });
        if (res.data && res.data.success !== false) {
          setLeaderboardData(res.data.leaderboard || []);
          setStats(res.data.stats || {});
          if (user && res.data.leaderboard) {
            const userRankIndex = res.data.leaderboard.findIndex(item => item.user_id === user.id || item.username === user.username);
            if (userRankIndex !== -1) {
              setUserRank({
                rank: userRankIndex + 1,
                ...res.data.leaderboard[userRankIndex]
              });
            } else {
              setUserRank(null);
            }
          }
        } else {
          throw new Error(res.data?.error || 'API response error');
        }
      } else if (activeTab === 'recent') {
        const res = await api.get('/api/game/recent-games');
        if (res.data) {
          setRecentFinishers(res.data.games || []);
        }
      } else if (activeTab === 'top') {
        const res = await api.get('/api/leaderboard/top-players');
        if (res.data && res.data.success !== false) {
          setTopPlayers(res.data.top_players || []);
        } else {
          throw new Error(res.data?.error || 'API response error');
        }
      }
    } catch (err) {
      console.error('Veri alınamadı:', err);
      setError(err.message || 'Network error');
      setLeaderboardData([]);
      setRecentFinishers([]);
      setTopPlayers([]);
      setUserRank(null);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLeaderboardData();
    setRefreshing(false);
  };

  const getPeriodDisplayName = (period) => {
    const periods = {
      daily: 'Günlük',
      weekly: 'Haftalık',
      monthly: 'Aylık',
      all: 'Tüm Zamanlar'
    };
    return periods[period] || period;
  };

  const getRankColor = (rank) => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return colors.primary;
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // ERROR COMPONENT
  const ErrorComponent = () => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>
        {error || 'Veri yüklenirken bir hata oluştu'}
      </Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={fetchLeaderboardData}
      >
        <Text style={styles.retryButtonText}>Tekrar Dene</Text>
      </TouchableOpacity>
    </View>
  );

  // LOADING COMPONENT
  const LoadingComponent = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[globalStyles.bodyText, { marginTop: 20 }]}>
        {activeTab === 'leaderboard' && 'Liderlik tablosu yükleniyor...'}
        {activeTab === 'recent' && 'Son bitirenler yükleniyor...'}
        {activeTab === 'top' && 'En iyi skorlar yükleniyor...'}
      </Text>
    </View>
  );

  // LEADERBOARD ITEM COMPONENT
  const LeaderboardItem = ({ item, index, isCurrentUser = false }) => {
    const rank = index + 1;
    const isTopThree = rank <= 3;
    return (
      <Animated.View
        style={[
          styles.item,
          isCurrentUser && styles.currentUserItem,
          { opacity: fadeAnim }
        ]}
      >
        <View style={styles.rankContainer}>
          <View style={[
            styles.rankBadge,
            isTopThree && styles.topRankBadge,
            { backgroundColor: getRankColor(rank) }
          ]}>
            <Text style={[
              styles.rankText,
              isTopThree && styles.topRankText
            ]}>
              {getRankIcon(rank)}
            </Text>
          </View>
        </View>
        <View style={styles.userInfo}>
          <View style={styles.userMain}>
            <Text style={[
              styles.userName,
              isCurrentUser && styles.currentUserName
            ]}>
              {item.username || 'Anonim'}
              {isCurrentUser && ' (Siz)'}
            </Text>
            <Text style={styles.userStatsText}>
              {item.games_played || 0} oyun • {item.total_correct_answers || 0} doğru
            </Text>
          </View>
          <View style={styles.scoreContainer}>
            <Text style={styles.score}>
              {item.total_score || 0}
            </Text>
            <Text style={styles.scoreLabel}>puan</Text>
          </View>
        </View>
        {isTopThree && (
          <View style={styles.topThreeDecoration}>
            <Text style={styles.topThreeIcon}>
              {rank === 1 ? '👑' : rank === 2 ? '⭐' : '🔥'}
            </Text>
          </View>
        )}
      </Animated.View>
    );
  };

  // RECENT FINISHER ITEM COMPONENT
  const RecentFinisherItem = ({ item, index }) => {
    return (
      <Animated.View style={[styles.item, { opacity: fadeAnim }]}>
        <View style={styles.rankContainer}>
          <Text style={styles.recentNumber}>{index + 1}</Text>
        </View>
        <View style={styles.userInfo}>
          <View style={styles.userMain}>
            <Text style={styles.userName}>
              {item.username || 'Anonim'}
            </Text>
            <Text style={styles.userStatsText}>
              {formatDate(item.end_time || item.completed_at)}
            </Text>
          </View>
          <View style={styles.scoreContainer}>
            <Text style={styles.score}>
              {item.final_score || item.score || 0}
            </Text>
            <Text style={styles.scoreLabel}>
              {item.correct_answers || 0}/{item.total_questions || 0} doğru
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  // TOP PLAYER ITEM COMPONENT
  const TopPlayerItem = ({ item, index }) => {
    const rank = index + 1;
    return (
      <Animated.View style={[styles.item, { opacity: fadeAnim }]}>
        <View style={styles.rankContainer}>
          <View style={[
            styles.rankBadge,
            { backgroundColor: getRankColor(rank) }
          ]}>
            <Text style={styles.rankText}>
              {getRankIcon(rank)}
            </Text>
          </View>
        </View>
        <View style={styles.userInfo}>
          <View style={styles.userMain}>
            <Text style={styles.userName}>
              {item.username || 'Anonim'}
            </Text>
            <Text style={styles.userStatsText}>
              {formatDate(item.completed_at)}
            </Text>
          </View>
          <View style={styles.scoreContainer}>
            <Text style={styles.score}>
              {item.best_score || item.score || 0}
            </Text>
            <Text style={styles.scoreLabel}>
              {item.correct_answers || 0}/{item.total_questions || 0} doğru
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  // USER RANK CARD
  const UserRankCard = () => {
    if (activeTab !== 'leaderboard') return null;
    if (!userRank) {
      return (
        <View style={styles.userRankCard}>
          <Text style={styles.userRankTitle}>Sıralamanız</Text>
          <Text style={styles.userRankMessage}>
            Henüz liderlik tablosunda değilsiniz
          </Text>
          <Text style={styles.userRankSubmessage}>
            Oyun oynayarak puan kazanın ve listede yer alın!
          </Text>
        </View>
      );
    }
    return (
      <GradientView
        colors={[colors.primary, colors.secondary]}
        style={styles.userRankCard}
      >
        <Text style={styles.userRankTitle}>Sıralamanız</Text>
        <View style={[styles.userRankInfo, { flexDirection: isDesktop ? 'row' : 'column' }]}>
          <View style={styles.userRank}>
            <Text style={styles.userRankNumber}>
              {getRankIcon(userRank.rank)}
            </Text>
            <Text style={styles.userRankText}>
              {userRank.rank}. sıra
            </Text>
          </View>
          <View style={[styles.userStatsContainer, { alignItems: isDesktop ? 'flex-end' : 'center' }]}>
            <Text style={[styles.userStat, { textAlign: isDesktop ? 'right' : 'center' }]}>
              {userRank.total_score || userRank.score || 0} puan
            </Text>
            <Text style={[styles.userStat, { textAlign: isDesktop ? 'right' : 'center' }]}>
              {userRank.games_played || 0} oyun
            </Text>
            <Text style={[styles.userStat, { textAlign: isDesktop ? 'right' : 'center' }]}>
              {userRank.total_correct_answers || userRank.correct_answers || 0} doğru
            </Text>
          </View>
        </View>
      </GradientView>
    );
  };

  // TAB NAVIGATION
  const TabNavigation = () => (
    <View style={styles.filtersContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filters}
        contentContainerStyle={styles.filtersContent}
      >
        <TouchableOpacity
          style={[
            styles.filterButton,
            { minWidth: isDesktop ? 120 : 100 },
            activeTab === 'leaderboard' && styles.filterButtonActive
          ]}
          onPress={() => setActiveTab('leaderboard')}
        >
          <Text style={[
            styles.filterButtonText,
            activeTab === 'leaderboard' && styles.filterButtonTextActive
          ]}>
            🏆 Liderlik
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            { minWidth: isDesktop ? 120 : 100 },
            activeTab === 'recent' && styles.filterButtonActive
          ]}
          onPress={() => setActiveTab('recent')}
        >
          <Text style={[
            styles.filterButtonText,
            activeTab === 'recent' && styles.filterButtonTextActive
          ]}>
            ⚡ Son Bitirenler
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            { minWidth: isDesktop ? 120 : 100 },
            activeTab === 'top' && styles.filterButtonActive
          ]}
          onPress={() => setActiveTab('top')}
        >
          <Text style={[
            styles.filterButtonText,
            activeTab === 'top' && styles.filterButtonTextActive
          ]}>
            💎 En İyi Skorlar
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  // PERIOD FILTERS (sadece leaderboard tab'ında)
  const PeriodFilters = () => {
    if (activeTab !== 'leaderboard') return null;
    return (
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filters}
          contentContainerStyle={styles.filtersContent}
        >
          {['all', 'daily', 'weekly', 'monthly'].map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.filterButton,
                { minWidth: isDesktop ? 120 : 100 },
                period === p && styles.filterButtonActive
              ]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[
                styles.filterButtonText,
                period === p && styles.filterButtonTextActive
              ]}>
                {p === 'all' && '🏆 Tüm Zamanlar'}
                {p === 'daily' && '📅 Günlük'}
                {p === 'weekly' && '📊 Haftalık'}
                {p === 'monthly' && '🗓️ Aylık'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // RENDER CONTENT BASED ON ACTIVE TAB
  const renderContent = () => {
    if (error) {
      return <ErrorComponent />;
    }
    if (loading && !refreshing) {
      return <LoadingComponent />;
    }
    let data = [];
    let emptyMessage = '';
    let emptySubmessage = '';
    if (activeTab === 'leaderboard') {
      data = leaderboardData;
      emptyMessage = 'Henüz veri yok';
      emptySubmessage = `${getPeriodDisplayName(period)} liderlik tablosu için henüz oyun kaydı bulunmuyor.`;
    } else if (activeTab === 'recent') {
      data = recentFinishers;
      emptyMessage = 'Henüz oyun bitiren yok';
      emptySubmessage = 'Son bitiren oyuncular burada görünecek.';
    } else if (activeTab === 'top') {
      data = topPlayers;
      emptyMessage = 'Henüz en iyi skor yok';
      emptySubmessage = 'En yüksek puanlı oyunlar burada görünecek.';
    }
    if (data.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>
            {activeTab === 'leaderboard' ? '📊' :
              activeTab === 'recent' ? '⚡' : '💎'}
          </Text>
          <Text style={styles.emptyTitle}>
            {emptyMessage}
          </Text>
          <Text style={styles.emptySubtitle}>
            {emptySubmessage}
          </Text>
        </View>
      );
    }
    return (
      <FlatList
        data={data}
        keyExtractor={(item, index) => `${item.user_id || item._id || item.username || 'item'}-${index}`}
        scrollEnabled={false}
        renderItem={({ item, index }) => {
          if (activeTab === 'leaderboard') {
            const isCurrentUser = user && (
              item.user_id === user.id ||
              item.username === user.username
            );
            return (
              <LeaderboardItem
                item={item}
                index={index}
                isCurrentUser={isCurrentUser}
              />
            );
          } else if (activeTab === 'recent') {
            return <RecentFinisherItem item={item} index={index} />;
          } else if (activeTab === 'top') {
            return <TopPlayerItem item={item} index={index} />;
          }
        }}
        contentContainerStyle={styles.listContent}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <GradientView
          colors={[colors.primary, colors.secondary]}
          style={styles.header}
        >
          <Text style={styles.title}>🏆 Liderlik Tablosu</Text>
          <Text style={styles.subtitle}>
            {activeTab === 'leaderboard' &&
              `${getPeriodDisplayName(period)} • En İyi Performanslar`}
            {activeTab === 'recent' && 'Son Oyunu Bitiren Oyuncular'}
            {activeTab === 'top' && 'En Yüksek Puanlı Oyunlar'}
          </Text>
        </GradientView>

        {/* Kullanıcı Sıralama Kartı */}
        <UserRankCard />

        {/* Tab Navigation */}
        <TabNavigation />

        {/* Period Filters */}
        <PeriodFilters />

        {/* İçerik */}
        <View style={styles.listContainer}>
          {renderContent()}
        </View>

        {/* İstatistikler */}
        {activeTab === 'leaderboard' &&
          stats &&
          Object.keys(stats).length > 0 && (
            <View style={styles.statsContainer}>
              <Text style={styles.statsTitle}>📈 İstatistikler</Text>
              <View style={[styles.statsGrid, { flexDirection: isDesktop ? 'row' : 'column' }]}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {stats.total_players || 0}
                  </Text>
                  <Text style={styles.statLabel}>
                    Toplam Oyuncu
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {stats.total_games || 0}
                  </Text>
                  <Text style={styles.statLabel}>Toplam Oyun</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {Math.round(stats.avg_score || 0)}
                  </Text>
                  <Text style={styles.statLabel}>Ortalama Skor</Text>
                </View>
              </View>
            </View>
          )}

        {/* Motivasyon Mesajı */}
        <View style={styles.motivation}>
          <Text style={styles.motivationText}>
            {activeTab === 'leaderboard' &&
              (userRank
                ? '💪 Harika gidiyorsun! Sıralamanda yükselmeye devam et!'
                : '🎯 İlk sıralarda yer almak için oyun oynamaya başla!')}
            {activeTab === 'recent' &&
              '⚡ Son oyunu bitiren oyuncuları takip et!'}
            {activeTab === 'top' &&
              '💎 En yüksek skorları geçmeye çalış!'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    width: '100%',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingBottom: responsivePadding(20),
  },
  header: {
    paddingVertical: responsivePadding(25),
    paddingHorizontal: responsivePadding(20),
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: responsiveFont(32),
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
    width: '100%',
  },
  subtitle: {
    fontSize: responsiveFont(16),
    color: colors.textPrimary,
    opacity: 0.9,
    textAlign: 'center',
    maxWidth: 600,
    width: '100%',
  },
  userRankCard: {
    margin: responsivePadding(20),
    padding: responsivePadding(20),
    borderRadius: 16,
    backgroundColor: colors.surface,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
      }
    }),
  },
  userRankTitle: {
    fontSize: responsiveFont(18),
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 15,
    textAlign: 'center',
    width: '100%',
  },
  userRankMessage: {
    fontSize: responsiveFont(16),
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
    width: '100%',
  },
  userRankSubmessage: {
    fontSize: responsiveFont(14),
    color: colors.textSecondary,
    textAlign: 'center',
    width: '100%',
  },
  userRankInfo: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 15,
    width: '100%',
  },
  userRank: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  userRankNumber: {
    fontSize: responsiveFont(24),
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginRight: 10,
  },
  userRankText: {
    fontSize: responsiveFont(14),
    color: colors.textPrimary,
    opacity: 0.9,
  },
  userStatsContainer: {},
  userStat: {
    fontSize: responsiveFont(14),
    color: colors.textPrimary,
    marginBottom: 4,
  },
  filtersContainer: {
    width: '100%',
    backgroundColor: colors.surface,
    paddingVertical: responsivePadding(10),
  },
  filters: {
    paddingHorizontal: responsivePadding(20),
    width: '100%',
  },
  filtersContent: {
    flexDirection: 'row',
    paddingHorizontal: responsivePadding(5),
  },
  filterButton: {
    paddingHorizontal: responsivePadding(15),
    paddingVertical: responsivePadding(8),
    borderRadius: 20,
    backgroundColor: colors.card,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterButtonText: {
    fontSize: responsiveFont(14),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  filterButtonTextActive: {
    color: colors.textPrimary,
  },
  listContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  listContent: {
    padding: responsivePadding(10),
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: responsivePadding(15),
    borderRadius: 12,
    marginBottom: 8,
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
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }
    }),
  },
  currentUserItem: {
    backgroundColor: colors.primary + '20',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  rankContainer: {
    marginRight: 15,
    width: 40,
    alignItems: 'center',
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topRankBadge: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
      }
    }),
  },
  rankText: {
    fontSize: responsiveFont(14),
    fontWeight: 'bold',
    color: colors.textDark,
  },
  topRankText: {
    color: colors.textPrimary,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  userMain: {
    flex: 1,
  },
  userName: {
    fontSize: responsiveFont(16),
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  currentUserName: {
    fontWeight: 'bold',
    color: colors.accent,
  },
  userStatsText: {
    fontSize: responsiveFont(12),
    color: colors.textSecondary,
  },
  scoreContainer: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  score: {
    fontSize: responsiveFont(18),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 2,
  },
  scoreLabel: {
    fontSize: responsiveFont(10),
    color: colors.textSecondary,
  },
  topThreeDecoration: {
    position: 'absolute',
    top: -5,
    right: -5,
  },
  topThreeIcon: {
    fontSize: responsiveFont(20),
  },
  emptyState: {
    alignItems: 'center',
    padding: responsivePadding(40),
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  emptyEmoji: {
    fontSize: responsiveFont(48),
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: responsiveFont(20),
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
    width: '100%',
  },
  emptySubtitle: {
    fontSize: responsiveFont(14),
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
    width: '100%',
  },
  statsContainer: {
    backgroundColor: colors.surface,
    margin: responsivePadding(20),
    padding: responsivePadding(20),
    borderRadius: 16,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  statsTitle: {
    fontSize: responsiveFont(18),
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 15,
    textAlign: 'center',
    width: '100%',
  },
  statsGrid: {
    justifyContent: 'space-between',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    marginVertical: 10,
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
  motivation: {
    backgroundColor: colors.card,
    margin: responsivePadding(20),
    padding: responsivePadding(20),
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  motivationText: {
    fontSize: responsiveFont(14),
    color: colors.textPrimary,
    textAlign: 'center',
    fontWeight: '500',
    width: '100%',
  },
  recentNumber: {
    fontSize: responsiveFont(16),
    fontWeight: 'bold',
    color: colors.textSecondary,
    width: 30,
    textAlign: 'center'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
    width: '100%',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    width: '100%',
  },
  errorText: {
    fontSize: responsiveFont(16),
    color: colors.error,
    textAlign: 'center',
    marginBottom: 20,
    width: '100%',
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
});

export default LeaderboardScreen;