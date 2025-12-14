import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native';
import { colors } from '../utils/colors';

/**
 * AchievementNotification - Achievement unlock animasyonu gösteren toast bileşeni
 * 
 * Özellikler:
 * - Ekranın üst tarafından animasyonlu giriş ve çıkış
 * - Otomatik 3 saniyelik gösterim sonrası kapanma
 * - Achievement adı ve açıklaması gösterir
 */
const AchievementNotification = ({ achievement, onHide }) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animasyonlu giriş
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: false,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: false,
      }),
    ]).start();

    // 3 saniye sonra otomatik kapanma
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 400,
          useNativeDriver: false,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: false,
        }),
      ]).start(() => {
        if (onHide) onHide();
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [achievement]);

  if (!achievement) return null;

  const getAchievementEmoji = (id) => {
    const emojiMap = {
      'FIRST_GAME': '🎮',
      'STREAK_5': '🔥',
      'STREAK_10': '🌟',
      'PERFECT_GAME': '💯',
      'SPEED_DEMON': '⚡',
      'WORD_MASTER': '📚',
      'LEADERBOARD_TOP_10': '🏆',
      'LEADERBOARD_TOP_1': '👑',
    };
    return emojiMap[id] || '⭐';
  };

  const getAchievementLabel = (id) => {
    const labels = {
      'FIRST_GAME': 'İlk Oyunu Tamamladın!',
      'STREAK_5': '5 Oyunluk Seri!',
      'STREAK_10': '10 Oyunluk Seri!',
      'PERFECT_GAME': 'Mükemmel Oyun!',
      'SPEED_DEMON': 'Hız Canavarı!',
      'WORD_MASTER': 'Kelime Ustası!',
      'LEADERBOARD_TOP_10': 'Top 10\'a Girerdin!',
      'LEADERBOARD_TOP_1': 'Birinci Oldun!',
    };
    return labels[id] || id;
  };

  const emoji = getAchievementEmoji(achievement.id);
  const label = getAchievementLabel(achievement.id);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.emoji}>{emoji}</Text>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{label}</Text>
          <Text style={styles.subtitle}>Achievement Açıldı!</Text>
        </View>
      </View>
      <View style={styles.glowBorder} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    marginHorizontal: 10,
    marginTop: Platform.OS === 'ios' ? 50 : 20,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  emoji: {
    fontSize: 48,
    marginRight: 12,
    marginTop: -8,
  },
  textContainer: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.accent,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  glowBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.accent,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    opacity: 0.6,
  },
});

export default AchievementNotification;
