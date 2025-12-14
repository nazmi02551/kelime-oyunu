// frontend/src/screens/DailyTasksScreen.js
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
import { globalStyles, componentStyles } from '../styles/globalStyles';
import { colors } from '../utils/colors';
import Alert from '../utils/alert';

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

const DailyTasksScreen = ({ navigation }) => {
  const { user, refreshUserData } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [dailyStats, setDailyStats] = useState({});
  const [claimingTask, setClaimingTask] = useState(null);

  const loadTasks = useCallback(async () => {
    try {
      const response = await api.get('/api/daily-tasks/tasks');
      if (response.data.success) {
        setTasks(response.data.tasks || []);
        setDailyStats(response.data.daily_stats || {});
      }
    } catch (error) {
      console.error('Günlük görevler yüklenemedi:', error);
      Alert.alert('Hata', 'Günlük görevler yüklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTasks();
  };

  const claimReward = async (taskId) => {
    setClaimingTask(taskId);
    try {
      const response = await api.post(`/api/daily-tasks/claim/${taskId}`);
      if (response.data.success) {
        Alert.alert('Tebrikler! 🎉', response.data.message);
        loadTasks();
        refreshUserData();
      } else {
        Alert.alert('Hata', response.data.error || 'Ödül alınamadı');
      }
    } catch (error) {
      Alert.alert('Hata', 'Ödül alınırken bir hata oluştu');
    } finally {
      setClaimingTask(null);
    }
  };

  const getProgressPercentage = (task) => {
    if (!task.target || task.target === 0) return 0;
    return Math.min(100, (task.progress / task.target) * 100);
  };

  const TaskCard = ({ task }) => {
    const progress = getProgressPercentage(task);
    const isCompleted = task.completed;
    const canClaim = isCompleted && !task.reward_claimed;
    const isClaimed = task.reward_claimed;

    return (
      <View style={styles.taskCard}>
        <View style={styles.taskHeader}>
          <Text style={styles.taskIcon}>{task.icon}</Text>
          <View style={styles.taskInfo}>
            <Text style={styles.taskName}>{task.name}</Text>
            <Text style={styles.taskDescription}>{task.description}</Text>
          </View>
          <View style={styles.rewardBadge}>
            <Text style={styles.rewardText}>+{task.reward_amount}</Text>
            <Text style={styles.rewardLabel}>puan</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${progress}%`,
                  backgroundColor: isCompleted ? colors.success : colors.primary 
                }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {task.progress}/{task.target}
          </Text>
        </View>

        {canClaim && (
          <TouchableOpacity 
            style={styles.claimButton}
            onPress={() => claimReward(task.task_id)}
            disabled={claimingTask === task.task_id}
          >
            {claimingTask === task.task_id ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.claimButtonText}>🎁 Ödülü Al</Text>
            )}
          </TouchableOpacity>
        )}

        {isClaimed && (
          <View style={styles.claimedBadge}>
            <Text style={styles.claimedText}>✅ Tamamlandı</Text>
          </View>
        )}
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

  const completedCount = tasks.filter(t => t.completed).length;
  const claimedCount = tasks.filter(t => t.reward_claimed).length;

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <GradientView colors={[colors.primary, colors.secondary]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Geri</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>📋 Günlük Görevler</Text>
          <View style={styles.headerStats}>
            <Text style={styles.headerStatsText}>
              {completedCount}/{tasks.length} Tamamlandı
            </Text>
          </View>
        </View>
      </GradientView>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Günlük İlerleme Özeti */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>📊 Bugünkü İlerleme</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{dailyStats.games_played || 0}</Text>
              <Text style={styles.summaryLabel}>Oyun</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{dailyStats.correct_answers || 0}</Text>
              <Text style={styles.summaryLabel}>Doğru</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{dailyStats.score_earned || 0}</Text>
              <Text style={styles.summaryLabel}>Puan</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{dailyStats.best_streak || 0}</Text>
              <Text style={styles.summaryLabel}>En İyi Seri</Text>
            </View>
          </View>
        </View>

        {/* Görev Listesi */}
        <View style={styles.tasksSection}>
          <Text style={styles.sectionTitle}>🎯 Görevler</Text>
          {tasks.length > 0 ? (
            tasks.map((task, index) => (
              <TaskCard key={task.task_id || index} task={task} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📭</Text>
              <Text style={styles.emptyStateText}>Bugün için görev bulunmuyor</Text>
            </View>
          )}
        </View>

        {/* Tamamlanan görevler için bonus */}
        {claimedCount === tasks.length && tasks.length > 0 && (
          <View style={styles.allCompletedCard}>
            <Text style={styles.allCompletedIcon}>🏆</Text>
            <Text style={styles.allCompletedTitle}>Tüm Görevler Tamamlandı!</Text>
            <Text style={styles.allCompletedText}>
              Harika iş! Yarın yeni görevler için tekrar gel.
            </Text>
          </View>
        )}

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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  headerStatsText: {
    color: '#fff',
    fontSize: 12,
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
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  tasksSection: {
    paddingHorizontal: 15,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  taskCard: {
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
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  taskIcon: {
    fontSize: 30,
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  taskDescription: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  rewardBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
  },
  rewardText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: 'bold',
  },
  rewardLabel: {
    color: colors.success,
    fontSize: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    minWidth: 45,
    textAlign: 'right',
  },
  claimButton: {
    backgroundColor: colors.success,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  claimButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  claimedBadge: {
    backgroundColor: colors.success + '20',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  claimedText: {
    color: colors.success,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateIcon: {
    fontSize: 50,
    marginBottom: 15,
  },
  emptyStateText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  allCompletedCard: {
    backgroundColor: colors.success + '20',
    margin: 15,
    padding: 25,
    borderRadius: 15,
    alignItems: 'center',
  },
  allCompletedIcon: {
    fontSize: 50,
    marginBottom: 10,
  },
  allCompletedTitle: {
    color: colors.success,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  allCompletedText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
};

export default DailyTasksScreen;
