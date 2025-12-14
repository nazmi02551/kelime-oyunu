// frontend/src/screens/FriendsScreen.js
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
  Alert,
  TextInput,
  Modal,
  FlatList,
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

const FriendsScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('friends'); // friends, requests, search
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const loadFriends = useCallback(async () => {
    try {
      const response = await api.get('/api/friends/list');
      if (response.data.success) {
        setFriends(response.data.friends || []);
      }
    } catch (error) {
      console.error('Arkadaşlar yüklenemedi:', error);
    }
  }, []);

  const loadRequests = useCallback(async () => {
    try {
      const response = await api.get('/api/friends/requests');
      if (response.data.success) {
        // Backend 'pending' döndürüyor
        setRequests(response.data.pending || []);
      }
    } catch (error) {
      console.error('İstekler yüklenemedi:', error);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadFriends(), loadRequests()]);
    setLoading(false);
    setRefreshing(false);
  }, [loadFriends, loadRequests]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const searchUsers = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      Alert.alert('Uyarı', 'En az 2 karakter girin');
      return;
    }
    
    setSearching(true);
    try {
      const response = await api.get(`/api/friends/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (response.data.success) {
        setSearchResults(response.data.users || []);
        if (response.data.users.length === 0) {
          Alert.alert('Sonuç', 'Kullanıcı bulunamadı');
        }
      }
    } catch (error) {
      Alert.alert('Hata', 'Arama yapılırken bir hata oluştu');
    } finally {
      setSearching(false);
    }
  };

  const sendFriendRequest = async (toUsername) => {
    setProcessingId(toUsername);
    try {
      const response = await api.post('/api/friends/send', { to_username: toUsername });
      if (response.data.success) {
        Alert.alert('Başarılı', 'Arkadaşlık isteği gönderildi');
        // Update search results to reflect the sent request
        setSearchResults(prev => prev.map(u => 
          u.username === toUsername ? { ...u, request_sent: true } : u
        ));
      } else {
        Alert.alert('Hata', response.data.error || 'İstek gönderilemedi');
      }
    } catch (error) {
      Alert.alert('Hata', error.response?.data?.error || 'İstek gönderilemedi');
    } finally {
      setProcessingId(null);
    }
  };

  const respondToRequest = async (friendshipId, accept) => {
    setProcessingId(friendshipId);
    try {
      const response = await api.post('/api/friends/respond', {
        friendship_id: friendshipId,
        accept: accept
      });
      if (response.data.success) {
        Alert.alert('Başarılı', accept ? 'Arkadaşlık isteği kabul edildi' : 'Arkadaşlık isteği reddedildi');
        loadData();
      } else {
        Alert.alert('Hata', response.data.error || 'İşlem başarısız');
      }
    } catch (error) {
      Alert.alert('Hata', 'İşlem sırasında bir hata oluştu');
    } finally {
      setProcessingId(null);
    }
  };

  const removeFriend = async (friendUsername) => {
    Alert.alert(
      'Arkadaşı Sil',
      `${friendUsername} adlı kişiyi arkadaş listenizden silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(friendUsername);
            try {
              const response = await api.post('/api/friends/remove', { friend_username: friendUsername });
              if (response.data.success) {
                Alert.alert('Başarılı', 'Arkadaş silindi');
                loadFriends();
              }
            } catch (error) {
              Alert.alert('Hata', 'Silme işlemi başarısız');
            } finally {
              setProcessingId(null);
            }
          }
        }
      ]
    );
  };

  const FriendCard = ({ friend }) => (
    <View style={styles.friendCard}>
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>
          {(friend.username || 'U').charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{friend.username}</Text>
        <Text style={styles.friendStats}>
          {friend.statistics?.total_score || friend.total_score || 0} puan • {friend.statistics?.games_played || friend.games_played || 0} oyun
        </Text>
      </View>
      <View style={styles.friendActions}>
        <TouchableOpacity 
          style={styles.messageButton}
          onPress={() => navigation.navigate('Chat', { 
            friendUsername: friend.username,
            friendId: friend.user_id || friend._id,
            conversationId: null
          })}
        >
          <Text style={styles.messageButtonText}>💬</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.removeButton}
          onPress={() => removeFriend(friend.username)}
          disabled={processingId === friend.username}
        >
          {processingId === friend.username ? (
            <ActivityIndicator size="small" color={colors.danger} />
          ) : (
            <Text style={styles.removeButtonText}>✕</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const RequestCard = ({ request }) => (
    <View style={styles.requestCard}>
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>
          {(request.from_username || 'U').charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.requestInfo}>
        <Text style={styles.requestName}>{request.from_username}</Text>
        <Text style={styles.requestDate}>
          {request.created_at ? new Date(request.created_at).toLocaleDateString('tr-TR') : ''}
        </Text>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => respondToRequest(request.request_id, true)}
          disabled={processingId === request.request_id}
        >
          {processingId === request.request_id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.actionButtonText}>✓</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => respondToRequest(request.request_id, false)}
          disabled={processingId === request.request_id}
        >
          <Text style={styles.actionButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const SearchResultCard = ({ user: searchUser }) => (
    <View style={styles.searchResultCard}>
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>
          {(searchUser.username || 'U').charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.searchResultInfo}>
        <Text style={styles.searchResultName}>{searchUser.username}</Text>
        <Text style={styles.searchResultStats}>
          {searchUser.total_score || 0} puan
        </Text>
      </View>
      {searchUser.is_friend ? (
        <View style={styles.friendBadge}>
          <Text style={styles.friendBadgeText}>Arkadaş</Text>
        </View>
      ) : searchUser.request_sent || searchUser.request_pending ? (
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingBadgeText}>Bekliyor</Text>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => sendFriendRequest(searchUser.username)}
          disabled={processingId === searchUser.username}
        >
          {processingId === searchUser.username ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.addButtonText}>+ Ekle</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'friends':
        return friends.length > 0 ? (
          friends.map((friend, index) => (
            <FriendCard key={friend.username || index} friend={friend} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>👥</Text>
            <Text style={styles.emptyStateTitle}>Henüz arkadaşınız yok</Text>
            <Text style={styles.emptyStateText}>
              Kullanıcı ara ve arkadaş ekle!
            </Text>
          </View>
        );

      case 'requests':
        return requests.length > 0 ? (
          requests.map((request, index) => (
            <RequestCard key={request.request_id || index} request={request} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📬</Text>
            <Text style={styles.emptyStateTitle}>Arkadaşlık isteği yok</Text>
            <Text style={styles.emptyStateText}>
              Yeni istekler burada görünecek
            </Text>
          </View>
        );

      case 'search':
        return (
          <View>
            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Kullanıcı adı ara..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={searchUsers}
                autoCapitalize="none"
              />
              <TouchableOpacity 
                style={styles.searchButton}
                onPress={searchUsers}
                disabled={searching}
              >
                {searching ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.searchButtonText}>🔍</Text>
                )}
              </TouchableOpacity>
            </View>
            
            {searchResults.length > 0 && (
              <View style={styles.searchResults}>
                {searchResults.map((searchUser, index) => (
                  <SearchResultCard key={searchUser.username || index} user={searchUser} />
                ))}
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={globalStyles.safeArea}>
      <GradientView colors={[colors.primary, colors.secondary]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Geri</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>👥 Arkadaşlar</Text>
          <View style={styles.headerStats}>
            <Text style={styles.headerStatsText}>{friends.length}</Text>
          </View>
        </View>
      </GradientView>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Arkadaşlar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
            İstekler {requests.length > 0 && `(${requests.length})`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'search' && styles.activeTab]}
          onPress={() => setActiveTab('search')}
        >
          <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
            Ara
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderContent()}
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
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: colors.primary + '20',
  },
  tabText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: colors.primary,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 15,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 50,
  },
  loadingText: {
    color: colors.textMuted,
    marginTop: 10,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  friendStats: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  friendActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageButtonText: {
    fontSize: 18,
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.danger + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: 'bold',
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  requestDate: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.danger,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 16,
    marginRight: 10,
  },
  searchButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {
    fontSize: 20,
  },
  searchResults: {
    marginTop: 10,
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchResultStats: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  friendBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  friendBadgeText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '600',
  },
  pendingBadge: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  pendingBadgeText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 50,
  },
  emptyStateIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyStateTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyStateText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
};

export default FriendsScreen;
