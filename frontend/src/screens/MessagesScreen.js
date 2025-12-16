// MessagesScreen.js - Tüm konuşmaları listeler
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../utils/colors';

// GradientView component
const GradientView = ({ colors: gradientColors, style, children }) => {
  if (Platform.OS === 'web') {
    return (
      <div style={{
        ...StyleSheet.flatten(style),
        background: `linear-gradient(135deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 100%)`,
      }}>
        {children}
      </div>
    );
  }
  const { LinearGradient } = require('expo-linear-gradient');
  return (
    <LinearGradient colors={gradientColors} style={style}>
      {children}
    </LinearGradient>
  );
};

const MessagesScreen = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchConversations = async () => {
    try {
      const response = await api.get('/api/messages/conversations');
      if (response.data.success) {
        setConversations(response.data.conversations || []);
      }
    } catch (error) {
      console.error('Konuşmalar yüklenirken hata:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/api/messages/unread-count');
      if (response.data.success) {
        setUnreadCount(response.data.unread_count || 0);
      }
    } catch (error) {
      console.error('Okunmamış sayısı alınırken hata:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
      fetchUnreadCount();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
    fetchUnreadCount();
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return 'Az önce';
    if (hours < 24) return `${hours} saat önce`;
    if (days < 7) return `${days} gün önce`;
    return date.toLocaleDateString('tr-TR');
  };

  const renderConversation = ({ item }) => {
    const hasUnread = item.unread_count > 0;

    return (
      <TouchableOpacity
        style={[
          styles.conversationCard,
          { backgroundColor: theme.colors.card },
          hasUnread && { borderLeftColor: theme.colors.primary, borderLeftWidth: 4 }
        ]}
        onPress={() => navigation.navigate('Chat', {
          conversationId: item.conversation_id,
          friendUsername: item.friend_username,
          friendId: item.friend_id
        })}
      >
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.avatarText}>
              {item.friend_username?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          {hasUnread && <View style={[styles.unreadBadge, { backgroundColor: theme.colors.error }]} />}
        </View>

        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <Text style={[styles.friendName, { color: theme.colors.text }, hasUnread && styles.boldText]}>
              {item.friend_username}
            </Text>
            <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
              {formatTime(item.last_message_at)}
            </Text>
          </View>

          <View style={styles.messagePreview}>
            <Text
              style={[
                styles.lastMessage,
                { color: hasUnread ? theme.colors.text : theme.colors.textSecondary },
                hasUnread && styles.boldText
              ]}
              numberOfLines={1}
            >
              {item.last_message || 'Henüz mesaj yok'}
            </Text>
            {hasUnread && (
              <View style={[styles.unreadCountBadge, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.unreadCountText}>{item.unread_count}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>💬</Text>
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        Henüz mesajınız yok
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        Arkadaşlarınızla mesajlaşmaya başlayın!
      </Text>
      <TouchableOpacity
        style={[styles.friendsButton, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('Friends')}
      >
        <Text style={styles.friendsButtonText}>Arkadaşlara Git</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <GradientView colors={[colors.primary, colors.secondary]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Geri</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            💬 Mesajlar {unreadCount > 0 && `(${unreadCount})`}
          </Text>
          <View style={styles.headerStats}>
            <Text style={styles.headerStatsText}>{conversations.length}</Text>
          </View>
        </View>
      </GradientView>

      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item, index) => item.conversation_id || `conv_${index}`}
        contentContainerStyle={conversations.length === 0 ? styles.emptyList : { flexGrow: 1, paddingBottom: 20 }}
        ListEmptyComponent={renderEmptyComponent}
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={15}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    minWidth: 60,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerStats: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 40,
    alignItems: 'center',
  },
  headerStatsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  list: {
    padding: 12,
  },
  emptyList: {
    flex: 1,
  },
  conversationCard: {
    flexDirection: 'row',
    padding: 16,
    minHeight: 80,
    backgroundColor: '#fff',
    marginBottom: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  unreadBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '500',
  },
  boldText: {
    fontWeight: 'bold',
  },
  time: {
    fontSize: 12,
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  unreadCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  friendsButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  friendsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MessagesScreen;
