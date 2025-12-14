// ChatScreen.js - Bireysel sohbet ekranı
import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const ChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { user } = useAuth();
  
  const { conversationId: initialConversationId, friendUsername, friendId } = route.params || {};
  
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const flatListRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Eğer conversationId yoksa, arkadaş ile konuşma başlat
  const initializeConversation = async () => {
    if (!conversationId && friendUsername) {
      try {
        const response = await api.post(`/api/messages/start/${friendUsername}`);
        if (response.data.success) {
          setConversationId(response.data.conversation_id);
          return response.data.conversation_id;
        }
      } catch (error) {
        console.error('Konuşma başlatılamadı:', error);
      }
    }
    return conversationId;
  };

  const fetchMessages = async (beforeId = null) => {
    const convId = conversationId || await initializeConversation();
    if (!convId) {
      setLoading(false);
      return;
    }
    
    try {
      const params = beforeId ? `?before_id=${beforeId}` : '';
      const response = await api.get(`/api/messages/conversation/${convId}${params}`);
      
      if (response.data.success) {
        const newMessages = response.data.messages || [];
        setHasMore(response.data.has_more || false);
        
        if (beforeId) {
          // Sayfalama - eski mesajları ekle
          setMessages(prev => [...prev, ...newMessages]);
        } else {
          // İlk yükleme
          setMessages(newMessages);
        }
      }
    } catch (error) {
      console.error('Mesajlar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const pollForNewMessages = async () => {
    if (!conversationId) return;
    try {
      const response = await api.get(`/api/messages/conversation/${conversationId}`);
      if (response.data.success) {
        const newMessages = response.data.messages || [];
        // Sadece yeni mesaj varsa güncelle
        if (newMessages.length > 0 && messages.length > 0) {
          if (newMessages[0]?._id !== messages[0]?._id) {
            setMessages(newMessages);
          }
        } else if (newMessages.length !== messages.length) {
          setMessages(newMessages);
        }
      }
    } catch (error) {
      // Polling hataları sessizce geç
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMessages();
      
      // Her 5 saniyede yeni mesaj kontrolü
      if (conversationId) {
        pollIntervalRef.current = setInterval(pollForNewMessages, 5000);
      }
      
      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      };
    }, [conversationId, friendUsername])
  );

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    
    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage('');
    
    // Optimistic update
    const tempMessage = {
      _id: `temp_${Date.now()}`,
      content: messageText,
      sender_id: user?.userId || user?._id,
      created_at: new Date().toISOString(),
      is_mine: true,
      pending: true
    };
    setMessages(prev => [tempMessage, ...prev]);
    
    try {
      const response = await api.post('/api/messages/send', {
        to_user_id: friendId,
        to_username: friendUsername,
        content: messageText
      });
      
      if (response.data.success) {
        // Gerçek mesajla güncelle
        fetchMessages();
      } else {
        Alert.alert('Hata', response.data.error || 'Mesaj gönderilemedi');
        // Temp mesajı kaldır
        setMessages(prev => prev.filter(m => m._id !== tempMessage._id));
        setNewMessage(messageText);
      }
    } catch (error) {
      console.error('Mesaj gönderirken hata:', error);
      Alert.alert('Hata', 'Mesaj gönderilemedi');
      // Temp mesajı kaldır
      setMessages(prev => prev.filter(m => m._id !== tempMessage._id));
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const loadMore = () => {
    if (!hasMore || loading) return;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?._id && !lastMessage._id.startsWith('temp_')) {
      fetchMessages(lastMessage._id);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Bugün';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Dün';
    } else {
      return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
    }
  };

  const deleteMessage = useCallback(async (messageId) => {
    try {
      const response = await api.delete(`/api/messages/delete/${messageId}`);
      if (response.data.success) {
        setMessages(prev => prev.filter(m => m._id !== messageId));
      } else {
        Alert.alert('Hata', response.data.error || 'Mesaj silinemedi');
      }
    } catch (error) {
      console.error('Mesaj silinirken hata:', error);
      Alert.alert('Hata', 'Mesaj silinemedi');
    }
  }, []);

  const handleLongPress = useCallback((item) => {
    if (!item.is_mine || item.pending) return;
    
    Alert.alert(
      'Mesaj İşlemleri',
      'Bu mesajı silmek istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: () => deleteMessage(item._id)
        }
      ]
    );
  }, [deleteMessage]);

  const renderMessage = ({ item, index }) => {
    const isMe = item.is_mine;
    const showDate = index === messages.length - 1 || 
      formatDate(item.created_at) !== formatDate(messages[index + 1]?.created_at);

    return (
      <View>
        {showDate && (
          <View style={styles.dateDivider}>
            <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
              {formatDate(item.created_at)}
            </Text>
          </View>
        )}
        <TouchableOpacity
          onLongPress={() => handleLongPress(item)}
          delayLongPress={500}
          activeOpacity={0.8}
        >
          <View style={[
            styles.messageBubble,
            isMe ? styles.myMessage : styles.theirMessage,
            isMe 
              ? { backgroundColor: theme.colors.primary }
              : { backgroundColor: theme.colors.card }
          ]}>
            <Text style={[
              styles.messageText,
              { color: isMe ? '#fff' : theme.colors.text }
            ]}>
              {item.content}
            </Text>
            <View style={styles.messageFooter}>
              <Text style={[
                styles.messageTime,
                { color: isMe ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary }
              ]}>
                {formatTime(item.created_at)}
              </Text>
              {item.pending && (
                <Text style={[styles.pendingIndicator, { color: 'rgba(255,255,255,0.7)' }]}>
                  ⏳
                </Text>
              )}
              {isMe && item.read && !item.pending && (
                <Text style={[styles.readIndicator, { color: 'rgba(255,255,255,0.7)' }]}>
                  ✓✓
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.backButton, { color: theme.colors.primary }]}>← Geri</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.headerAvatar, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.headerAvatarText}>
              {friendUsername?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            {friendUsername}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView 
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item, index) => item._id || `msg_${index}`}
          inverted
          contentContainerStyle={styles.messagesList}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          // Performance optimizations
          removeClippedSubviews={true}
          maxToRenderPerBatch={15}
          windowSize={10}
          initialNumToRender={20}
          getItemLayout={undefined}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                Henüz mesaj yok. İlk mesajı gönder! 👋
              </Text>
            </View>
          )}
        />

        <View style={[styles.inputContainer, { 
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border 
        }]}>
          <TextInput
            style={[styles.textInput, { 
              backgroundColor: theme.colors.background,
              color: theme.colors.text
            }]}
            placeholder="Mesaj yaz..."
            placeholderTextColor={theme.colors.textSecondary}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: theme.colors.primary },
              (!newMessage.trim() || sending) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>➤</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 60,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    padding: 12,
    flexGrow: 1,
  },
  dateDivider: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateText: {
    fontSize: 12,
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
  },
  myMessage: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  pendingIndicator: {
    fontSize: 10,
    marginLeft: 4,
  },
  readIndicator: {
    fontSize: 10,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 20,
    color: '#fff',
  },
});

export default ChatScreen;
