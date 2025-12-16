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
  TextInput,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import socketService from '../services/SocketService';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../utils/colors';
import achievementManager from '../services/AchievementManager';
import { responsiveFont, responsivePadding } from '../utils/dimensions';

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
  const { showSuccess, showError, showWarning, showInfo, showConfirm } = useNotification();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('friends'); // friends, requests, sent-requests, invites, sent-invites, search
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]); // Gelen arkadaşlık istekleri
  const [sentRequests, setSentRequests] = useState([]); // Giden arkadaşlık istekleri
  const [gameInvites, setGameInvites] = useState([]);
  const [sentInvites, setSentInvites] = useState([]); // Gönderilen davetler
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showQuestionCountModal, setShowQuestionCountModal] = useState(false);
  const [selectedFriendForInvite, setSelectedFriendForInvite] = useState(null);

  const viewProfile = async (username) => {
    setProfileLoading(true);
    setShowProfileModal(true);
    try {
      const response = await api.get(`/api/friends/profile/${username}`);
      if (response.data.success) {
        setSelectedProfile(response.data.profile);
      } else {
        showError(response.data.error || 'Profil yüklenemedi');
        setShowProfileModal(false);
      }
    } catch (error) {
      console.error('Profil yüklenemedi:', error);
      showError('Profil yüklenemedi');
      setShowProfileModal(false);
    } finally {
      setProfileLoading(false);
    }
  };

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

  const loadSentRequests = useCallback(async () => {
    try {
      console.log('📤 Giden arkadaşlık istekleri yükleniyor...');
      const response = await api.get('/api/friends/requests');
      console.log('📨 Sent requests response:', response.data);
      if (response.data.success) {
        setSentRequests(response.data.sent || []);
        console.log('✅ Giden istekler yüklendi:', response.data.sent?.length || 0);
        console.log('📋 Giden istekler detay:', response.data.sent);
      }
    } catch (error) {
      console.error('❌ Giden istekler yüklenemedi:', error);
    }
  }, []);

  const loadGameInvites = useCallback(async () => {
    try {
      const response = await api.get('/api/game-invites/pending');
      if (response.data.success) {
        setGameInvites(response.data.invites || []);
      }
    } catch (error) {
      console.error('Davetler yüklenemedi:', error);
    }
  }, []);

  const loadSentInvites = useCallback(async () => {
    try {
      console.log('📩 Gönderilen oyun davetleri yükleniyor...');
      const response = await api.get('/api/game-invites/sent');
      console.log('📨 Sent invites response:', response.data);
      if (response.data.success) {
        setSentInvites(response.data.invites || []);
        console.log('✅ Gönderilen davetler yüklendi:', response.data.invites?.length || 0);
      }
    } catch (error) {
      console.error('❌ Gönderilen davetler yüklenemedi:', error);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadFriends(), loadRequests(), loadSentRequests(), loadGameInvites(), loadSentInvites()]);
    setLoading(false);
    setRefreshing(false);
  }, [loadFriends, loadRequests, loadSentRequests, loadGameInvites, loadSentInvites]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // WebSocket listener'ları - davet kabul/red/iptal bildirimleri için
  useEffect(() => {
    const setupSocketListeners = async () => {
      console.log('🔌 FriendsScreen: WebSocket listener\'ları kuruluyor...');
      const socket = await socketService.connect();
      
      if (!socket) {
        console.warn('⚠️ FriendsScreen: Socket bağlantısı kurulamadı');
        return;
      }

      console.log('✅ FriendsScreen: Socket bağlı, listener\'lar ekleniyor');

      // Davet kabul edildi - GÖNDEREN BU EVENT'İ ALIR
      socketService.on('invite_accepted', (data) => {
        console.log('📨 [FriendsScreen] Davet kabul edildi:', data);
        const message = data.message || `${data.accepted_by_username} oyun davetinizi kabul etti!`;
        showSuccess(message);
        
        // Oyun ekranına yönlendir
        if (data.game_id) {
          setTimeout(() => {
            navigation.navigate('MultiplayerGame', { gameId: data.game_id });
          }, 500);
        }
        loadSentInvites();
      });

      // Davet reddedildi
      socketService.on('invite_declined', (data) => {
        console.log('📨 [FriendsScreen] Davet reddedildi:', data);
        showWarning(data.message || `${data.declined_by_username} davetinizi reddetti`);
        loadSentInvites();
      });

      // Davet iptal edildi
      socketService.on('invite_cancelled', (data) => {
        console.log('📨 [FriendsScreen] Davet iptal edildi:', data);
        showInfo(data.message || `${data.cancelled_by_username} davetini iptal etti`);
        loadGameInvites();
      });

      // Yeni oyun daveti geldi
      socketService.on('game_invite', (data) => {
        console.log('📨 [FriendsScreen] Yeni oyun daveti:', data);
        showInfo('🎮 Yeni oyun daveti aldınız!');
        loadGameInvites();
      });

      // Oyun iptal edildi
      socketService.on('game_cancelled', (data) => {
        console.log('📨 [FriendsScreen] Oyun iptal edildi:', data);
        showWarning(data.message || 'Oyun iptal edildi');
      });
    };

    setupSocketListeners();

    // Cleanup
    return () => {
      console.log('🧹 FriendsScreen: WebSocket listener\'ları temizleniyor');
      socketService.off('invite_accepted');
      socketService.off('invite_declined');
      socketService.off('invite_cancelled');
      socketService.off('game_invite');
      socketService.off('game_cancelled');
    };
  }, [navigation, showSuccess, showWarning, showInfo, loadSentInvites, loadGameInvites]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const searchUsers = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      showWarning('En az 2 karakter girin');
      return;
    }
    
    setSearching(true);
    try {
      const response = await api.get(`/api/friends/search?q=${encodeURIComponent(searchQuery.trim())}`);
      if (response.data.success) {
        setSearchResults(response.data.users || []);
        if (response.data.users.length === 0) {
          showInfo('Kullanıcı bulunamadı');
        }
      }
    } catch (error) {
      showError('Arama yapılırken bir hata oluştu');
    } finally {
      setSearching(false);
    }
  };

  const sendFriendRequest = async (toUsername) => {
    setProcessingId(toUsername);
    try {
      const response = await api.post('/api/friends/send', { to_username: toUsername });
      if (response.data.success) {
        showSuccess('Arkadaşlık isteği gönderildi');
        // Update search results to reflect the sent request
        setSearchResults(prev => prev.map(u => 
          u.username === toUsername ? { ...u, request_sent: true } : u
        ));
      } else {
        showError(response.data.error || 'İstek gönderilemedi');
      }
    } catch (error) {
      showError(error.response?.data?.error || 'İstek gönderilemedi');
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
        showSuccess(accept ? 'Arkadaşlık isteği kabul edildi' : 'Arkadaşlık isteği reddedildi');
        loadData();
      } else {
        showError(response.data.error || 'İşlem başarısız');
      }
    } catch (error) {
      showError('İşlem sırasında bir hata oluştu');
    } finally {
      setProcessingId(null);
    }
  };

  const removeFriend = async (friendUsername) => {
    showConfirm(
      'Arkadaşı Sil',
      `${friendUsername} adlı kişiyi arkadaş listenizden silmek istediğinize emin misiniz?`,
      async () => {
        setProcessingId(friendUsername);
        try {
          const response = await api.post('/api/friends/remove', { friend_username: friendUsername });
          if (response.data.success) {
            showSuccess('Arkadaş silindi');
            loadFriends();
          } else {
            showError(response.data.error || 'Silme işlemi başarısız');
          }
        } catch (error) {
          console.error('Arkadaş silme hatası:', error);
          showError(error.response?.data?.error || 'Silme işlemi başarısız');
        } finally {
          setProcessingId(null);
        }
      },
      { confirmText: 'Sil', cancelText: 'İptal' }
    );
  };

  // Arkadaşlık isteğini iptal et
  const cancelFriendRequest = async (requestId) => {
    console.log('🚫 İptal isteği gönderiliyor, requestId:', requestId);
    showConfirm(
      'İsteği İptal Et',
      'Arkadaşlık isteğini iptal etmek istediğinize emin misiniz?',
      async () => {
        try {
          console.log('✅ Kullanıcı onayladı, API çağrısı yapılıyor...');
          setProcessingId(requestId);
          const response = await api.delete(`/api/friends/cancel/${requestId}`);
          console.log('📨 API yanıtı:', response.data);
          if (response.data.success) {
            showSuccess('İstek iptal edildi');
            setSentRequests(prev => prev.filter(req => req.request_id !== requestId));
          } else {
            showError(response.data.error || 'İptal işlemi başarısız');
          }
        } catch (error) {
          console.error('❌ İstek iptal hatası:', error);
          showError('İptal işlemi başarısız');
        } finally {
          setProcessingId(null);
        }
      },
      { confirmText: 'İptal Et', cancelText: 'Vazgeç' }
    );
  };

  const sendGameInvite = async (friend) => {
    // Modal aç, soru sayısı seçimi yap
    setSelectedFriendForInvite(friend);
    setShowQuestionCountModal(true);
  };

  const confirmSendGameInvite = async (questionCount) => {
    try {
      setProcessingId(selectedFriendForInvite.username);
      setShowQuestionCountModal(false);
      console.log('Oyun daveti gönderiliyor:', selectedFriendForInvite.username, questionCount);
      const response = await api.post('/api/game-invites/send', {
        to_username: selectedFriendForInvite.username,
        game_settings: { question_count: questionCount }
      });
      
      console.log('Davet yanıtı:', response.data);
      
      if (response.data.success) {
        showSuccess(response.data.message || `${questionCount} soruluk oyun daveti gönderildi!`);
        // Gönderilen davetleri yeniden yükle
        if (activeTab === 'sent-invites') {
          loadSentInvites();
        }
      } else {
        showError(response.data.error || 'Davet gönderilemedi');
      }
    } catch (error) {
      console.error('Davet gönderme hatası:', error.response?.data || error.message);
      showError(error.response?.data?.error || 'Davet gönderilemedi');
    } finally {
      setProcessingId(null);
      setSelectedFriendForInvite(null);
    }
  };

  const respondToGameInvite = async (inviteId, accept) => {
    try {
      setProcessingId(inviteId);
      console.log(`Davet yanıtlanıyor: ${inviteId}, accept: ${accept}`);
      
      const response = await api.post(`/api/game-invites/respond/${inviteId}`, { accept });
      console.log('API yanıtı:', response.data);
      
      if (response.data.success) {
        setGameInvites(prev => prev.filter(inv => inv.invite_id !== inviteId));
        if (accept && response.data.game_id) {
          // Multiplayer oyuna yönlendir
          showSuccess('🎮 Oyun Başlıyor! Rakibiniz hazır olduğunda oyun başlayacak.');
          setTimeout(() => {
            navigation.navigate('MultiplayerGame', { gameId: response.data.game_id });
          }, 500);
        } else if (accept) {
          showSuccess(response.data.message || 'Davet kabul edildi!');
        } else {
          showInfo('Davet reddedildi');
        }
      } else {
        console.error('API hatası:', response.data);
        showError(response.data.error || 'İşlem başarısız');
      }
    } catch (error) {
      console.error('Davet yanıt hatası:', error);
      console.error('Hata detayı:', error.response?.data || error.message);
      showError(error.response?.data?.error || 'İşlem başarısız');
    } finally {
      setProcessingId(null);
    }
  };

  // Gönderilen daveti iptal et
  const cancelGameInvite = async (inviteId) => {
    console.log('🚫 Oyun daveti iptali başlıyor, inviteId:', inviteId);
    showConfirm(
      'Daveti İptal Et',
      'Gönderdiğiniz oyun davetini iptal etmek istediğinize emin misiniz?',
      async () => {
        try {
          console.log('✅ Kullanıcı onayladı, API çağrısı yapılıyor...');
          setProcessingId(inviteId);
          const response = await api.delete(`/api/game-invites/cancel/${inviteId}`);
          console.log('📨 Cancel API yanıtı:', response.data);
          if (response.data.success) {
            showSuccess('Davet iptal edildi');
            setSentInvites(prev => prev.filter(inv => inv.invite_id !== inviteId));
            console.log('✅ Davet listeden kaldırıldı');
          } else {
            showError(response.data.error || 'İptal işlemi başarısız');
          }
        } catch (error) {
          console.error('❌ Davet iptal hatası:', error);
          showError('İptal işlemi başarısız');
        } finally {
          setProcessingId(null);
        }
      },
      { confirmText: 'İptal Et', cancelText: 'Vazgeç' }
    );
  };

  const FriendCard = ({ friend }) => {
    const handleInvite = () => {
      sendGameInvite(friend);
    };
    
    const handleMessage = () => {
      navigation.navigate('Chat', { 
        friendUsername: friend.username,
        friendId: friend.user_id || friend._id,
        conversationId: null
      });
    };
    
    const handleRemove = () => {
      removeFriend(friend.username);
    };
    
    const handleProfile = () => {
      viewProfile(friend.username);
    };
    
    return (
      <View style={styles.friendCard}>
        <TouchableOpacity 
          style={styles.friendMainArea} 
          onPress={handleProfile}
          activeOpacity={0.7}
        >
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
        </TouchableOpacity>
        <View style={styles.friendActions}>
          <TouchableOpacity 
            style={styles.inviteButton}
            onPress={handleInvite}
            disabled={processingId === friend.username}
          >
            {processingId === friend.username ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.inviteButtonText}>🎮</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.messageButton}
            onPress={handleMessage}
          >
            <Text style={styles.messageButtonText}>💬</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.removeButton}
            onPress={handleRemove}
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
  };

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

  const GameInviteCard = ({ invite }) => (
    <View style={styles.inviteCard}>
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>
          {(invite.from_username || 'U').charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.inviteInfo}>
        <Text style={styles.inviteName}>{invite.from_username}</Text>
        <Text style={styles.inviteDetails}>
          🎮 {invite.game_settings?.question_count || 10} soruluk oyun daveti
        </Text>
        <Text style={styles.inviteTime}>
          {invite.created_at ? new Date(invite.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''}
        </Text>
      </View>
      <View style={styles.inviteActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.acceptButton]}
          onPress={() => respondToGameInvite(invite.invite_id, true)}
          disabled={processingId === invite.invite_id}
        >
          {processingId === invite.invite_id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.actionButtonText}>✓</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => respondToGameInvite(invite.invite_id, false)}
          disabled={processingId === invite.invite_id}
        >
          <Text style={styles.actionButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
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
          <View>
            <Text style={styles.sectionTitle}>← Gelen Arkadaşlık İstekleri ({requests.length})</Text>
            {requests.map((request, index) => (
              <RequestCard key={request.request_id || index} request={request} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📬</Text>
            <Text style={styles.emptyStateTitle}>Gelen istek yok</Text>
            <Text style={styles.emptyStateText}>
              Gelen istekler burada görünecek
            </Text>
          </View>
        );

      case 'sent-requests':
        console.log('🔍 Rendering sent-requests tab, sentRequests:', sentRequests);
        console.log('📊 sentRequests.length:', sentRequests.length);
        sentRequests.forEach((req, idx) => {
          console.log(`  Request ${idx}: status="${req.status}", to="${req.to_username}", id="${req.request_id}"`);
        });
        
        return sentRequests.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>📤 Giden Arkadaşlık İstekleri ({sentRequests.length})</Text>
            {sentRequests.map((request, index) => (
              <View key={request.request_id || index} style={styles.requestCard}>
                <View style={styles.avatarContainer}>
                  <Text style={styles.avatarText}>
                    {(request.to_username || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.requestInfo}>
                  <Text style={styles.requestName}>{request.to_username}</Text>
                  <Text style={styles.requestTime}>
                    {request.status === 'pending' && '⏳ Yanıt bekleniyor'}
                    {request.status === 'accepted' && '✅ Kabul Edildi'}
                    {request.status === 'rejected' && '❌ Reddedildi'}
                  </Text>
                </View>
                {request.status === 'pending' && (
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => cancelFriendRequest(request.request_id)}
                    disabled={processingId === request.request_id}
                  >
                    {processingId === request.request_id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.actionButtonText}>✕</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📤</Text>
            <Text style={styles.emptyStateTitle}>Giden istek yok</Text>
            <Text style={styles.emptyStateText}>
              Gönderdiğiniz istekler burada görünecek
            </Text>
          </View>
        );

      case 'invites':
        return gameInvites.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>← 🎮 Gelen Oyun Davetleri ({gameInvites.length})</Text>
            {gameInvites.map((invite, index) => (
              <GameInviteCard key={invite.invite_id || index} invite={invite} />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🎮</Text>
            <Text style={styles.emptyStateTitle}>Gelen oyun daveti yok</Text>
            <Text style={styles.emptyStateText}>
              Arkadaşlarınızdan gelen davetler burada görünecek
            </Text>
          </View>
        );

      case 'sent-invites':
        return sentInvites.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>🎮 → Gönderilen Oyun Davetleri ({sentInvites.length})</Text>
            {sentInvites.map((invite, index) => (
              <View key={invite.invite_id || index} style={styles.inviteCard}>
                <View style={styles.avatarContainer}>
                  <Text style={styles.avatarText}>
                    {(invite.to_username || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.inviteInfo}>
                  <Text style={styles.inviteName}>{invite.to_username}</Text>
                  <Text style={styles.inviteDetails}>
                    🎮 {invite.game_settings?.question_count || 10} soruluk davet
                  </Text>
                  <Text style={styles.inviteTime}>
                    ⏳ Yanıt bekleniyor...
                  </Text>
                </View>
                <View style={styles.inviteActions}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => cancelGameInvite(invite.invite_id)}
                    disabled={processingId === invite.invite_id}
                  >
                    {processingId === invite.invite_id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.actionButtonText}>✕</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🎮</Text>
            <Text style={styles.emptyStateTitle}>Gönderilen davet yok</Text>
            <Text style={styles.emptyStateText}>
              Arkadaşlarınıza oyun daveti gönderin
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
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            👥
          </Text>
          <Text style={[styles.tabLabel, activeTab === 'friends' && styles.activeTabLabel]}>
            Arkadaş
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
              📥
            </Text>
            {requests.length > 0 && (
              <Text style={styles.tabBadge}>{requests.length}</Text>
            )}
          </View>
          <Text style={[styles.tabLabel, activeTab === 'requests' && styles.activeTabLabel]}>
            Gelen
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'sent-requests' && styles.activeTab]}
          onPress={() => setActiveTab('sent-requests')}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[styles.tabText, activeTab === 'sent-requests' && styles.activeTabText]}>
              📤
            </Text>
            {sentRequests.length > 0 && (
              <Text style={styles.tabBadge}>{sentRequests.length}</Text>
            )}
          </View>
          <Text style={[styles.tabLabel, activeTab === 'sent-requests' && styles.activeTabLabel]}>
            Giden
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'invites' && styles.activeTab]}
          onPress={() => setActiveTab('invites')}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[styles.tabText, activeTab === 'invites' && styles.activeTabText]}>
              🎮
            </Text>
            {gameInvites.length > 0 && (
              <Text style={styles.tabBadge}>{gameInvites.length}</Text>
            )}
          </View>
          <Text style={[styles.tabLabel, activeTab === 'invites' && styles.activeTabLabel]}>
            Davet
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'sent-invites' && styles.activeTab]}
          onPress={() => setActiveTab('sent-invites')}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[styles.tabText, activeTab === 'sent-invites' && styles.activeTabText]}>
              📩
            </Text>
            {sentInvites.length > 0 && (
              <Text style={styles.tabBadge}>{sentInvites.length}</Text>
            )}
          </View>
          <Text style={[styles.tabLabel, activeTab === 'sent-invites' && styles.activeTabLabel]}>
            Gönder
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'search' && styles.activeTab]}
          onPress={() => setActiveTab('search')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
            🔍
          </Text>
          <Text style={[styles.tabLabel, activeTab === 'search' && styles.activeTabLabel]}>
            Ara
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ flexGrow: 1, minHeight: '100%', paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderContent()}
      </ScrollView>

      {/* Profil Modal */}
      <Modal
        visible={showProfileModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.profileModal}>
            <TouchableOpacity 
              style={styles.closeModalButton}
              onPress={() => setShowProfileModal(false)}
            >
              <Text style={styles.closeModalText}>✕</Text>
            </TouchableOpacity>
            
            {profileLoading ? (
              <View style={styles.profileLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Profil yükleniyor...</Text>
              </View>
            ) : selectedProfile ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.profileHeader}>
                  <View style={styles.profileAvatar}>
                    <Text style={styles.profileAvatarText}>
                      {(selectedProfile.username || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.profileUsername}>{selectedProfile.username}</Text>
                  {selectedProfile.created_at && (
                    <Text style={styles.profileJoined}>
                      Katılım: {new Date(selectedProfile.created_at).toLocaleDateString('tr-TR')}
                    </Text>
                  )}
                </View>

                {selectedProfile.statistics && (
                  <View style={styles.profileStats}>
                    <Text style={styles.profileSectionTitle}>📊 İstatistikler</Text>
                    <View style={styles.statsGrid}>
                      <View style={styles.statBox}>
                        <Text style={styles.statValue}>{selectedProfile.statistics.total_score}</Text>
                        <Text style={styles.statLabel}>Toplam Puan</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statValue}>{selectedProfile.statistics.games_played}</Text>
                        <Text style={styles.statLabel}>Oyun</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statValue}>{selectedProfile.statistics.success_rate}%</Text>
                        <Text style={styles.statLabel}>Başarı</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statValue}>{selectedProfile.statistics.longest_streak}</Text>
                        <Text style={styles.statLabel}>En Uzun Seri</Text>
                      </View>
                    </View>
                  </View>
                )}

                {selectedProfile.achievements && selectedProfile.achievements.length > 0 && (
                  <View style={styles.profileAchievements}>
                    <Text style={styles.profileSectionTitle}>
                      🏅 Başarımlar ({selectedProfile.achievements_count})
                    </Text>
                    {selectedProfile.achievements.map((ach, index) => {
                      const definitions = achievementManager?.getDefinitions?.() || {};
                      const achDef = definitions[ach.id];
                      return (
                        <View key={ach.id || index} style={styles.achievementItem}>
                          <Text style={styles.achievementIcon}>{achDef?.icon || '🏅'}</Text>
                          <View style={styles.achievementInfo}>
                            <Text style={styles.achievementName}>{achDef?.name || ach.name || ach.id}</Text>
                            {ach.unlocked_at && (
                              <Text style={styles.achievementDate}>
                                {new Date(ach.unlocked_at).toLocaleDateString('tr-TR')}
                              </Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {!selectedProfile.is_self && selectedProfile.is_friend && (
                  <View style={styles.profileActions}>
                    <TouchableOpacity 
                      style={styles.profileActionButton}
                      onPress={() => {
                        setShowProfileModal(false);
                        navigation.navigate('Chat', {
                          friendUsername: selectedProfile.username,
                          friendId: selectedProfile.user_id,
                          conversationId: null
                        });
                      }}
                    >
                      <Text style={styles.profileActionText}>💬 Mesaj Gönder</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.profileActionButton, styles.inviteActionButton]}
                      onPress={() => {
                        setShowProfileModal(false);
                        sendGameInvite({ username: selectedProfile.username });
                      }}
                    >
                      <Text style={styles.profileActionText}>🎮 Oyuna Davet Et</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Soru Sayısı Seçim Modali */}
      <Modal
        visible={showQuestionCountModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowQuestionCountModal(false);
          setSelectedFriendForInvite(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.questionCountModal}>
            <Text style={styles.questionCountTitle}>
              🎮 Soru Sayısı Seçin
            </Text>
            <Text style={styles.questionCountSubtitle}>
              {selectedFriendForInvite?.username} ile kaç soruluk oyun oynamak istersiniz?
            </Text>
            
            <View style={styles.questionCountOptions}>
              {[5, 10, 15, 20].map(count => (
                <TouchableOpacity
                  key={count}
                  style={styles.questionCountButton}
                  onPress={() => confirmSendGameInvite(count)}
                >
                  <Text style={styles.questionCountButtonText}>{count}</Text>
                  <Text style={styles.questionCountButtonLabel}>soru</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity
              style={styles.cancelQuestionCountButton}
              onPress={() => {
                setShowQuestionCountModal(false);
                setSelectedFriendForInvite(null);
              }}
            >
              <Text style={styles.cancelQuestionCountText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = {
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 25,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 15,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  headerStats: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  headerStatsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    marginHorizontal: 3,
    position: 'relative',
    minHeight: 70,
  },
  activeTab: {
    backgroundColor: colors.primary + '15',
    borderBottomWidth: 3,
    borderBottomColor: colors.primary,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 2,
  },
  activeTabText: {
    color: colors.primary,
  },
  tabLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  activeTabLabel: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 11,
  },
  tabBadge: {
    color: '#fff',
    backgroundColor: colors.danger,
    fontWeight: 'bold',
    fontSize: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 15,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
    minHeight: 300,
  },
  loadingText: {
    color: colors.textMuted,
    marginTop: 15,
    fontSize: 16,
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
  friendMainArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  inviteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteButtonText: {
    fontSize: 18,
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
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#9b59b6',
  },
  inviteInfo: {
    flex: 1,
  },
  inviteName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  inviteDetails: {
    color: '#9b59b6',
    fontSize: 13,
    marginTop: 2,
  },
  inviteTime: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  inviteActions: {
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
  cancelButton: {
    backgroundColor: colors.warning || '#ffc107',
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
  // Profile Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  profileModal: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  closeModalButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeModalText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileLoading: {
    alignItems: 'center',
    padding: 50,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  profileAvatarText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  profileUsername: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileJoined: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 5,
  },
  profileStats: {
    marginBottom: 20,
  },
  profileSectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  statValue: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 5,
  },
  profileAchievements: {
    marginBottom: 20,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  achievementIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  achievementDate: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  profileActions: {
    gap: 10,
  },
  profileActionButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  inviteActionButton: {
    backgroundColor: colors.success,
  },
  profileActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  questionCountModal: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 25,
    width: '85%',
    maxWidth: 400,
  },
  questionCountTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  questionCountSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 25,
  },
  questionCountOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    gap: 10,
  },
  questionCountButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 15,
    paddingVertical: 20,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
  },
  questionCountButtonText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  questionCountButtonLabel: {
    color: '#fff',
    fontSize: 12,
    marginTop: 5,
    opacity: 0.9,
  },
  cancelQuestionCountButton: {
    backgroundColor: colors.danger,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelQuestionCountText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // MODERN STYLES - Admin/Profile tarzı
  avatarContainerLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTextLarge: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  gameButtonModern: {
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 6,
  },
  messageButtonModern: {
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 6,
  },
  removeButtonModern: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  actionIconLarge: {
    fontSize: 20,
    color: '#fff',
  },
  inviteCardModern: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.border + '40',
  },
  acceptButtonModern: {
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 8,
  },
  rejectButtonModern: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonTextLarge: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  friendScore: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
};

export default FriendsScreen;
