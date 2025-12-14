// frontend/src/components/SkeletonLoader.js
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors } from '../utils/colors';

const SkeletonLoader = ({ 
  width = '100%', 
  height = 20, 
  borderRadius = 4,
  style 
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.card, colors.border || '#e0e0e0'],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    />
  );
};

// Message Skeleton
export const MessageSkeleton = () => (
  <View style={styles.messageContainer}>
    <View style={styles.messageSent}>
      <SkeletonLoader width={200} height={50} borderRadius={15} />
    </View>
    <View style={styles.messageReceived}>
      <SkeletonLoader width={180} height={40} borderRadius={15} />
    </View>
    <View style={styles.messageSent}>
      <SkeletonLoader width={150} height={35} borderRadius={15} />
    </View>
  </View>
);

// Conversation List Skeleton
export const ConversationSkeleton = () => (
  <View style={styles.conversationContainer}>
    {[1, 2, 3, 4, 5].map((i) => (
      <View key={i} style={styles.conversationItem}>
        <SkeletonLoader width={50} height={50} borderRadius={25} />
        <View style={styles.conversationInfo}>
          <SkeletonLoader width={120} height={16} style={{ marginBottom: 8 }} />
          <SkeletonLoader width={180} height={12} />
        </View>
        <SkeletonLoader width={40} height={12} />
      </View>
    ))}
  </View>
);

// Friend List Skeleton
export const FriendSkeleton = () => (
  <View style={styles.friendContainer}>
    {[1, 2, 3, 4].map((i) => (
      <View key={i} style={styles.friendItem}>
        <SkeletonLoader width={50} height={50} borderRadius={25} />
        <View style={styles.friendInfo}>
          <SkeletonLoader width={100} height={16} style={{ marginBottom: 6 }} />
          <SkeletonLoader width={150} height={12} />
        </View>
        <View style={styles.friendActions}>
          <SkeletonLoader width={36} height={36} borderRadius={18} />
          <SkeletonLoader width={36} height={36} borderRadius={18} />
        </View>
      </View>
    ))}
  </View>
);

// Game Card Skeleton
export const GameSkeleton = () => (
  <View style={styles.gameContainer}>
    <SkeletonLoader width="100%" height={200} borderRadius={15} style={{ marginBottom: 20 }} />
    <View style={styles.gameStats}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.gameStat}>
          <SkeletonLoader width={60} height={40} borderRadius={8} />
          <SkeletonLoader width={50} height={12} style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
    <SkeletonLoader width="100%" height={50} borderRadius={25} style={{ marginTop: 20 }} />
  </View>
);

// Leaderboard Skeleton
export const LeaderboardSkeleton = () => (
  <View style={styles.leaderboardContainer}>
    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
      <View key={i} style={styles.leaderboardItem}>
        <SkeletonLoader width={30} height={30} borderRadius={15} />
        <SkeletonLoader width={40} height={40} borderRadius={20} style={{ marginLeft: 10 }} />
        <View style={styles.leaderboardInfo}>
          <SkeletonLoader width={100} height={14} style={{ marginBottom: 4 }} />
          <SkeletonLoader width={60} height={12} />
        </View>
        <SkeletonLoader width={50} height={20} borderRadius={10} />
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  messageContainer: {
    padding: 15,
  },
  messageSent: {
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  messageReceived: {
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  conversationContainer: {
    padding: 15,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
  },
  conversationInfo: {
    flex: 1,
    marginLeft: 15,
  },
  friendContainer: {
    padding: 15,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
  },
  friendInfo: {
    flex: 1,
    marginLeft: 15,
  },
  friendActions: {
    flexDirection: 'row',
    gap: 8,
  },
  gameContainer: {
    padding: 20,
  },
  gameStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gameStat: {
    alignItems: 'center',
  },
  leaderboardContainer: {
    padding: 15,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  leaderboardInfo: {
    flex: 1,
    marginLeft: 10,
  },
});

export default SkeletonLoader;
