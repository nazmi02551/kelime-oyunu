// frontend/src/screens/AdminSettings.js - TAM EKRAN UYUMLU GÜNCELLENMİŞ VERSİYON
import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
  RefreshControl,
  SafeAreaView,
  Platform,
  StyleSheet,
  Dimensions
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import EventBus from '../services/EventBus';
import { globalStyles, componentStyles } from '../styles/globalStyles';
import { colors } from '../utils/colors';
import { responsiveFont, responsivePadding } from '../utils/dimensions';

const { width, height } = Dimensions.get('window');

// GradientView bileşeni
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

const AdminSettings = ({ navigation }) => {
  const { user, signOut } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [settingsHistory, setSettingsHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [settings, setSettings] = useState({
    // Genel Ayarlar
    site_name: 'Kelime Oyunu',
    site_description: 'Eğlenceli kelime oyunu',
    maintenance_mode: false,
    user_registration: true,
    max_users: 1000,
    
    // Oyun Ayarları
    default_difficulty: 'medium',
    max_questions_per_game: 20,
    base_time_per_question: 60,
    base_points_per_question: 100,
    hint_cost: 50,
    adaptive_difficulty_enabled: true,
    
    // Puanlama Ayarları
    streak_bonus_enabled: true,
    streak_bonus_multiplier: 1.5,
    time_bonus_enabled: true,
    max_time_bonus: 50,
    
    // SMTP Ayarları
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    smtp_from_email: 'noreply@kelimeoyunu.com',
    
    // Güvenlik Ayarları
    max_login_attempts: 5,
    session_timeout: 60,
    password_min_length: 6,
    require_email_verification: false,
  });

  const [stats, setStats] = useState({
    total_users: 0,
    active_today: 0,
    total_games: 0,
    average_score: 0,
  });

  // Admin kontrolü - sadece admin kullanıcılar erişebilir
  useEffect(() => {
    if (!user?.is_admin) {
      Alert.alert(
        'Erişim Engellendi',
        'Bu sayfaya erişim izniniz yok.',
        [{ text: 'Tamam', onPress: () => navigation.goBack() }]
      );
    } else {
      loadSettings();
      loadStats();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/admin/settings').catch(() => ({ data: settings }));
      if (res.data) {
        setSettings(res.data);
      }
      // Load history alongside settings
      await loadSettingsHistory();
      return res.data || settings;
    } catch (error) {
      console.warn('Ayarlar yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettingsHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await api.get('/api/admin/settings/history').catch(() => ({ data: { history: [] } }));
      if (res.data && Array.isArray(res.data.history)) {
        setSettingsHistory(res.data.history);
      }
    } catch (error) {
      console.warn('Ayarlar geçmişi yüklenemedi:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Use public leaderboard overview endpoint which returns total_users, active_today, total_games, average_score
      const res = await api.get('/api/leaderboard/overview').catch(() => ({ 
        data: {
          total_users: 0,
          active_today: 0,
          total_games: 0,
          average_score: 0,
        }
      }));
      if (res.data) {
        setStats(res.data);
      }
    } catch (error) {
      console.warn('İstatistikler yüklenemedi:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadSettings(), loadStats()]);
    setRefreshing(false);
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const res = await api.post('/api/admin/settings', settings);
      Alert.alert('Başarılı', 'Ayarlar başarıyla kaydedildi.');
      // Update local state if backend returned canonical settings
      const newSettings = (res && res.data) ? res.data : settings;
      if (newSettings) setSettings(newSettings);
      // Notify app to apply settings live
      EventBus.emit('admin:settings-updated', newSettings);
    } catch (error) {
      console.warn('Ayarlar kaydedilemedi:', error);
      Alert.alert('Bilgi', 'Ayarlar demo modunda çalışıyor. Backend entegrasyonu için endpointleri kontrol edin.');
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const rollbackSettings = async (historyId) => {
    try {
      setLoading(true);
      const res = await api.post(`/api/admin/settings/rollback/${historyId}`);
      Alert.alert('Başarılı', 'Ayarlar başarıyla geri alındı.');
      // Fetch latest settings from server and notify app
      const settingsRes = await api.get('/api/admin/settings').catch(() => ({ data: null }));
      if (settingsRes && settingsRes.data) {
        setSettings(settingsRes.data);
        EventBus.emit('admin:settings-updated', settingsRes.data);
      }
      await loadSettingsHistory();
    } catch (error) {
      console.warn('Rollback başarısız:', error);
      Alert.alert('Hata', 'Ayarlar geri alınırken hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const performAdminAction = async (action, params = {}) => {
    try {
      setLoading(true);
      const res = await api.post(`/api/admin/${action}`, params);
      Alert.alert('Başarılı', res.data.message || 'İşlem başarıyla tamamlandı.');
    } catch (error) {
      Alert.alert('Bilgi', 'Bu işlem demo modunda çalışıyor. Backend entegrasyonu için endpointleri kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  const SettingsHistoryModal = () => {
    if (!showHistoryModal) return null;

    return (
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📜 Ayarlar Geçmişi</Text>
            <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
              <Text style={styles.modalCloseButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {historyLoading ? (
            <View style={styles.modalLoadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Geçmiş yükleniyor...</Text>
            </View>
          ) : settingsHistory.length === 0 ? (
            <View style={styles.modalEmptyContainer}>
              <Text style={styles.modalEmptyText}>📭 Henüz değişiklik kaydı yok</Text>
            </View>
          ) : (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {settingsHistory.map((entry, index) => (
                <View key={index} style={styles.historyItem}>
                  <View style={styles.historyItemHeader}>
                    <View>
                      <Text style={styles.historyItemUser}>👤 {entry.changed_by || 'Admin'}</Text>
                      <Text style={styles.historyItemDate}>
                        📅 {new Date(entry.changed_at).toLocaleString('tr-TR')}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.rollbackButton}
                      onPress={() => {
                        Alert.alert(
                          'Geri Al',
                          'Bu ayarlara geri dönmek istediğinizden emin misiniz?',
                          [
                            { text: 'İptal', onPress: () => {} },
                            {
                              text: 'Geri Al',
                              onPress: () => {
                                setShowHistoryModal(false);
                                rollbackSettings(entry._id);
                              },
                              style: 'destructive',
                            },
                          ]
                        );
                      }}
                    >
                      <Text style={styles.rollbackButtonText}>↩️ Geri Al</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {entry.old && (
                    <View style={styles.historyItemSection}>
                      <Text style={styles.historyItemSectionTitle}>Önceki Değerler</Text>
                      <View style={styles.historyItemContent}>
                        <Text style={styles.historyItemText} numberOfLines={3}>
                          {JSON.stringify(entry.old, null, 2).substring(0, 100)}...
                        </Text>
                      </View>
                    </View>
                  )}
                  
                  {entry.new && (
                    <View style={styles.historyItemSection}>
                      <Text style={styles.historyItemSectionTitle}>Yeni Değerler</Text>
                      <View style={styles.historyItemContent}>
                        <Text style={styles.historyItemText} numberOfLines={3}>
                          {JSON.stringify(entry.new, null, 2).substring(0, 100)}...
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity
            style={styles.modalCloseButtonFull}
            onPress={() => setShowHistoryModal(false)}
          >
            <Text style={styles.modalCloseButtonText}>Kapat</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Admin olmayan kullanıcılar için erişim engellendi mesajı
  if (!user?.is_admin) {
    return (
      <SafeAreaView style={[globalStyles.safeArea, styles.fullScreenContainer]}>
        <View style={[globalStyles.centeredContainer, styles.fullScreenContent]}>
          <Text style={globalStyles.title}>Erişim Engellendi</Text>
          <Text style={[globalStyles.bodyText, { textAlign: 'center', marginTop: 20 }]}>
            Bu sayfaya erişim izniniz bulunmamaktadır.
          </Text>
          <TouchableOpacity
            style={[styles.button, { marginTop: 20 }]}
            onPress={() => navigation.goBack()}
          >
            <GradientView
              colors={[colors.primary, colors.secondary]}
              style={styles.gradientButton}
            >
              <Text style={styles.buttonText}>Geri Dön</Text>
            </GradientView>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const AdminStatsCard = () => (
    <View style={styles.statsCard}>
      <Text style={styles.statsTitle}>📊 Sistem İstatistikleri</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.total_users}</Text>
          <Text style={styles.statLabel}>Toplam Kullanıcı</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.active_today}</Text>
          <Text style={styles.statLabel}>Bugün Aktif</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.total_games}</Text>
          <Text style={styles.statLabel}>Toplam Oyun</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{Math.round(stats.average_score || 0)}</Text>
          <Text style={styles.statLabel}>Ortalama Puan</Text>
        </View>
      </View>
    </View>
  );

  const QuickActions = () => (
    <View style={styles.quickActions}>
      <Text style={styles.sectionTitle}>⚡ Hızlı İşlemler</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowHistoryModal(true)}
        >
          <Text style={styles.actionEmoji}>📜</Text>
          <Text style={styles.actionText}>Geçmişi Görüntüle</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => performAdminAction('clear-cache')}
        >
          <Text style={styles.actionEmoji}>🧹</Text>
          <Text style={styles.actionText}>Önbelleği Temizle</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => performAdminAction('backup-database')}
        >
          <Text style={styles.actionEmoji}>💾</Text>
          <Text style={styles.actionText}>Yedek Al</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => performAdminAction('send-test-email')}
        >
          <Text style={styles.actionEmoji}>📧</Text>
          <Text style={styles.actionText}>Test Maili</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => performAdminAction('update-leaderboard')}
        >
          <Text style={styles.actionEmoji}>🔄</Text>
          <Text style={styles.actionText}>Liderliği Güncelle</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const GeneralSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>🌐 Genel Ayarlar</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Site Adı</Text>
        <TextInput
          style={styles.input}
          value={settings.site_name}
          onChangeText={(value) => handleSettingChange('site_name', value)}
          placeholder="Site adını giriniz"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Site Açıklaması</Text>
        <TextInput
          style={styles.input}
          value={settings.site_description}
          onChangeText={(value) => handleSettingChange('site_description', value)}
          placeholder="Site açıklamasını giriniz"
          multiline
        />
      </View>

      <View style={styles.switchGroup}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Bakım Modu</Text>
          <Switch
            value={settings.maintenance_mode}
            onValueChange={(value) => handleSettingChange('maintenance_mode', value)}
            trackColor={{ false: colors.cardLight, true: colors.primary }}
          />
        </View>
        <Text style={styles.switchDescription}>
          Bakım modu açıkken sadece adminler siteye erişebilir.
        </Text>
      </View>

      <View style={styles.switchGroup}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Yeni Kayıtlar</Text>
          <Switch
            value={settings.user_registration}
            onValueChange={(value) => handleSettingChange('user_registration', value)}
            trackColor={{ false: colors.cardLight, true: colors.primary }}
          />
        </View>
        <Text style={styles.switchDescription}>
          Yeni kullanıcı kaydına izin ver.
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Maksimum Kullanıcı Sayısı</Text>
        <TextInput
          style={styles.input}
          value={settings.max_users?.toString()}
          onChangeText={(value) => handleSettingChange('max_users', parseInt(value) || 0)}
          keyboardType="numeric"
          placeholder="1000"
        />
      </View>
    </View>
  );

  const GameSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>🎮 Oyun Ayarları</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Varsayılan Zorluk</Text>
        <View style={styles.optionGroup}>
          {['easy', 'medium', 'hard'].map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.optionButton,
                settings.default_difficulty === level && styles.optionButtonActive
              ]}
              onPress={() => handleSettingChange('default_difficulty', level)}
            >
              <Text style={[
                styles.optionText,
                settings.default_difficulty === level && styles.optionTextActive
              ]}>
                {level === 'easy' ? 'Kolay' : level === 'medium' ? 'Orta' : 'Zor'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Oyun Başına Maksimum Soru</Text>
        <TextInput
          style={styles.input}
          value={settings.max_questions_per_game?.toString()}
          onChangeText={(value) => handleSettingChange('max_questions_per_game', parseInt(value) || 0)}
          keyboardType="numeric"
          placeholder="20"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Soru Başına Süre (saniye)</Text>
        <TextInput
          style={styles.input}
          value={settings.base_time_per_question?.toString()}
          onChangeText={(value) => handleSettingChange('base_time_per_question', parseInt(value) || 0)}
          keyboardType="numeric"
          placeholder="60"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Soru Başına Temel Puan</Text>
        <TextInput
          style={styles.input}
          value={settings.base_points_per_question?.toString()}
          onChangeText={(value) => handleSettingChange('base_points_per_question', parseInt(value) || 0)}
          keyboardType="numeric"
          placeholder="100"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>İpucu Maliyeti (puan)</Text>
        <TextInput
          style={styles.input}
          value={settings.hint_cost?.toString()}
          onChangeText={(value) => handleSettingChange('hint_cost', parseInt(value) || 0)}
          keyboardType="numeric"
          placeholder="50"
        />
      </View>

      <View style={styles.switchGroup}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Uyarlanabilir Zorluk</Text>
          <Switch
            value={settings.adaptive_difficulty_enabled}
            onValueChange={(value) => handleSettingChange('adaptive_difficulty_enabled', value)}
            trackColor={{ false: colors.cardLight, true: colors.primary }}
          />
        </View>
        <Text style={styles.switchDescription}>
          Kullanıcı performansına göre otomatik zorluk ayarı.
        </Text>
      </View>
    </View>
  );

  const ScoringSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>⭐ Puanlama Ayarları</Text>

      <View style={styles.switchGroup}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Seri Bonusu</Text>
          <Switch
            value={settings.streak_bonus_enabled}
            onValueChange={(value) => handleSettingChange('streak_bonus_enabled', value)}
            trackColor={{ false: colors.cardLight, true: colors.primary }}
          />
        </View>
        <Text style={styles.switchDescription}>
          Üst üste doğru cevap veren kullanıcılara bonus puan.
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Seri Bonus Çarpanı</Text>
        <TextInput
          style={styles.input}
          value={settings.streak_bonus_multiplier?.toString()}
          onChangeText={(value) => handleSettingChange('streak_bonus_multiplier', parseFloat(value) || 1.0)}
          keyboardType="numeric"
          placeholder="1.5"
        />
      </View>

      <View style={styles.switchGroup}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Süre Bonusu</Text>
          <Switch
            value={settings.time_bonus_enabled}
            onValueChange={(value) => handleSettingChange('time_bonus_enabled', value)}
            trackColor={{ false: colors.cardLight, true: colors.primary }}
          />
        </View>
        <Text style={styles.switchDescription}>
          Hızlı cevap veren kullanıcılara ekstra puan.
        </Text>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Maksimum Süre Bonusu</Text>
        <TextInput
          style={styles.input}
          value={settings.max_time_bonus?.toString()}
          onChangeText={(value) => handleSettingChange('max_time_bonus', parseInt(value) || 0)}
          keyboardType="numeric"
          placeholder="50"
        />
      </View>
    </View>
  );

  const SecuritySettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>🔒 Güvenlik Ayarları</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Maksimum Giriş Denemesi</Text>
        <TextInput
          style={styles.input}
          value={settings.max_login_attempts?.toString()}
          onChangeText={(value) => handleSettingChange('max_login_attempts', parseInt(value) || 0)}
          keyboardType="numeric"
          placeholder="5"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Oturum Süresi (dakika)</Text>
        <TextInput
          style={styles.input}
          value={settings.session_timeout?.toString()}
          onChangeText={(value) => handleSettingChange('session_timeout', parseInt(value) || 0)}
          keyboardType="numeric"
          placeholder="60"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Minimum Şifre Uzunluğu</Text>
        <TextInput
          style={styles.input}
          value={settings.password_min_length?.toString()}
          onChangeText={(value) => handleSettingChange('password_min_length', parseInt(value) || 0)}
          keyboardType="numeric"
          placeholder="6"
        />
      </View>

      <View style={styles.switchGroup}>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>E-posta Doğrulama Gerekli</Text>
          <Switch
            value={settings.require_email_verification}
            onValueChange={(value) => handleSettingChange('require_email_verification', value)}
            trackColor={{ false: colors.cardLight, true: colors.primary }}
          />
        </View>
        <Text style={styles.switchDescription}>
          Yeni kullanıcıların e-posta doğrulaması yapması gerekir.
        </Text>
      </View>
    </View>
  );

  const SMTPSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>📧 E-posta Ayarları (SMTP)</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>SMTP Sunucusu</Text>
        <TextInput
          style={styles.input}
          value={settings.smtp_host}
          onChangeText={(value) => handleSettingChange('smtp_host', value)}
          placeholder="smtp.gmail.com"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>SMTP Port</Text>
        <TextInput
          style={styles.input}
          value={settings.smtp_port?.toString()}
          onChangeText={(value) => handleSettingChange('smtp_port', parseInt(value) || 587)}
          keyboardType="numeric"
          placeholder="587"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>SMTP Kullanıcı Adı</Text>
        <TextInput
          style={styles.input}
          value={settings.smtp_username}
          onChangeText={(value) => handleSettingChange('smtp_username', value)}
          placeholder="kullanici@gmail.com"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>SMTP Şifresi</Text>
        <TextInput
          style={styles.input}
          value={settings.smtp_password}
          onChangeText={(value) => handleSettingChange('smtp_password', value)}
          placeholder="••••••••"
          secureTextEntry
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Gönderen E-posta</Text>
        <TextInput
          style={styles.input}
          value={settings.smtp_from_email}
          onChangeText={(value) => handleSettingChange('smtp_from_email', value)}
          placeholder="noreply@siteadiniz.com"
        />
      </View>
    </View>
  );

  // =====================
  // BAŞARIM YÖNETİMİ BİLEŞENİ
  // =====================
  const AchievementsManagement = () => {
    const [achievements, setAchievements] = useState([]);
    const [achievementLoading, setAchievementLoading] = useState(true);
    const [editingAchievement, setEditingAchievement] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newAchievement, setNewAchievement] = useState({
      id: '', name: '', description: '', icon: '🏆', 
      requirement_type: 'games_played', requirement_value: 1, 
      reward_points: 100, active: true
    });

    useEffect(() => {
      loadAchievements();
    }, []);

    const loadAchievements = async () => {
      try {
        setAchievementLoading(true);
        const response = await api.get('/api/admin/achievements');
        if (response.data.success) {
          setAchievements(response.data.achievements || []);
        }
      } catch (error) {
        console.error('Başarımlar yüklenemedi:', error);
      } finally {
        setAchievementLoading(false);
      }
    };

    const saveAchievement = async (achievement) => {
      try {
        if (editingAchievement) {
          await api.put(`/api/admin/achievements/${achievement.id}`, achievement);
          Alert.alert('Başarılı', 'Başarım güncellendi');
        } else {
          await api.post('/api/admin/achievements', achievement);
          Alert.alert('Başarılı', 'Başarım oluşturuldu');
        }
        setEditingAchievement(null);
        setShowAddForm(false);
        loadAchievements();
      } catch (error) {
        Alert.alert('Hata', error.response?.data?.error || 'İşlem başarısız');
      }
    };

    const deleteAchievement = async (achievementId) => {
      Alert.alert('Sil', 'Bu başarımı silmek istediğinize emin misiniz?', [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/admin/achievements/${achievementId}`);
              Alert.alert('Başarılı', 'Başarım silindi');
              loadAchievements();
            } catch (error) {
              Alert.alert('Hata', 'Silme işlemi başarısız');
            }
          }
        }
      ]);
    };

    const AchievementForm = ({ data, onSave, onCancel }) => {
      const [form, setForm] = useState(data);
      
      return (
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>{editingAchievement ? 'Başarım Düzenle' : 'Yeni Başarım'}</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>ID (benzersiz)</Text>
            <TextInput
              style={styles.input}
              value={form.id}
              onChangeText={(v) => setForm({...form, id: v})}
              placeholder="streak_20"
              editable={!editingAchievement}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>İsim</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(v) => setForm({...form, name: v})}
              placeholder="Süper Seri"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Açıklama</Text>
            <TextInput
              style={styles.input}
              value={form.description}
              onChangeText={(v) => setForm({...form, description: v})}
              placeholder="20 doğru seri yap"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>İkon (emoji)</Text>
            <TextInput
              style={styles.input}
              value={form.icon}
              onChangeText={(v) => setForm({...form, icon: v})}
              placeholder="🔥"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gereksinim Tipi</Text>
            <View style={styles.pickerContainer}>
              {['games_played', 'total_score', 'best_streak', 'perfect_game', 'fast_answer', 'consecutive_days'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.pickerOption, form.requirement_type === type && styles.pickerOptionActive]}
                  onPress={() => setForm({...form, requirement_type: type})}
                >
                  <Text style={[styles.pickerOptionText, form.requirement_type === type && styles.pickerOptionTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Hedef Değer</Text>
            <TextInput
              style={styles.input}
              value={form.requirement_value?.toString()}
              onChangeText={(v) => setForm({...form, requirement_value: parseInt(v) || 0})}
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ödül Puanı</Text>
            <TextInput
              style={styles.input}
              value={form.reward_points?.toString()}
              onChangeText={(v) => setForm({...form, reward_points: parseInt(v) || 0})}
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Aktif</Text>
            <Switch
              value={form.active}
              onValueChange={(v) => setForm({...form, active: v})}
              trackColor={{ false: colors.border, true: colors.success }}
            />
          </View>
          
          <View style={styles.formButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitButton} onPress={() => onSave(form)}>
              <Text style={styles.submitButtonText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    };

    if (achievementLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🏆 Başarım Yönetimi</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => { setShowAddForm(true); setEditingAchievement(null); setNewAchievement({
              id: '', name: '', description: '', icon: '🏆', 
              requirement_type: 'games_played', requirement_value: 1, 
              reward_points: 100, active: true
            }); }}
          >
            <Text style={styles.addButtonText}>+ Ekle</Text>
          </TouchableOpacity>
        </View>

        {(showAddForm || editingAchievement) && (
          <AchievementForm 
            data={editingAchievement || newAchievement}
            onSave={saveAchievement}
            onCancel={() => { setShowAddForm(false); setEditingAchievement(null); }}
          />
        )}

        {achievements.map((achievement) => (
          <View key={achievement.id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemIcon}>{achievement.icon}</Text>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{achievement.name}</Text>
                <Text style={styles.itemDescription}>{achievement.description}</Text>
                <Text style={styles.itemMeta}>
                  {achievement.requirement_type}: {achievement.requirement_value} | Ödül: {achievement.reward_points} puan
                </Text>
              </View>
              <View style={[styles.statusBadge, achievement.active ? styles.activeBadge : styles.inactiveBadge]}>
                <Text style={styles.statusBadgeText}>{achievement.active ? 'Aktif' : 'Pasif'}</Text>
              </View>
            </View>
            <View style={styles.itemActions}>
              <TouchableOpacity style={styles.editButton} onPress={() => setEditingAchievement(achievement)}>
                <Text style={styles.editButtonText}>✏️ Düzenle</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={() => deleteAchievement(achievement.id)}>
                <Text style={styles.deleteButtonText}>🗑️ Sil</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  // =====================
  // GÜNLÜK GÖREV YÖNETİMİ BİLEŞENİ
  // =====================
  const DailyTasksManagement = () => {
    const [tasks, setTasks] = useState([]);
    const [taskLoading, setTaskLoading] = useState(true);
    const [editingTask, setEditingTask] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newTask, setNewTask] = useState({
      id: '', name: '', description: '', icon: '📋', 
      task_type: 'games_played', target: 1, 
      reward_points: 100, active: true
    });

    useEffect(() => {
      loadTasks();
    }, []);

    const loadTasks = async () => {
      try {
        setTaskLoading(true);
        const response = await api.get('/api/admin/daily-task-definitions');
        if (response.data.success) {
          setTasks(response.data.tasks || []);
        }
      } catch (error) {
        console.error('Görevler yüklenemedi:', error);
      } finally {
        setTaskLoading(false);
      }
    };

    const saveTask = async (task) => {
      try {
        if (editingTask) {
          await api.put(`/api/admin/daily-task-definitions/${task.id}`, task);
          Alert.alert('Başarılı', 'Görev tanımı güncellendi');
        } else {
          await api.post('/api/admin/daily-task-definitions', task);
          Alert.alert('Başarılı', 'Görev tanımı oluşturuldu');
        }
        setEditingTask(null);
        setShowAddForm(false);
        loadTasks();
      } catch (error) {
        Alert.alert('Hata', error.response?.data?.error || 'İşlem başarısız');
      }
    };

    const deleteTask = async (taskId) => {
      Alert.alert('Sil', 'Bu görev tanımını silmek istediğinize emin misiniz?', [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/admin/daily-task-definitions/${taskId}`);
              Alert.alert('Başarılı', 'Görev tanımı silindi');
              loadTasks();
            } catch (error) {
              Alert.alert('Hata', 'Silme işlemi başarısız');
            }
          }
        }
      ]);
    };

    const TaskForm = ({ data, onSave, onCancel }) => {
      const [form, setForm] = useState(data);
      
      return (
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>{editingTask ? 'Görev Düzenle' : 'Yeni Görev'}</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>ID (benzersiz)</Text>
            <TextInput
              style={styles.input}
              value={form.id}
              onChangeText={(v) => setForm({...form, id: v})}
              placeholder="play_5_games"
              editable={!editingTask}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>İsim</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={(v) => setForm({...form, name: v})}
              placeholder="Beş Oyun"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Açıklama</Text>
            <TextInput
              style={styles.input}
              value={form.description}
              onChangeText={(v) => setForm({...form, description: v})}
              placeholder="5 oyun oyna"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>İkon (emoji)</Text>
            <TextInput
              style={styles.input}
              value={form.icon}
              onChangeText={(v) => setForm({...form, icon: v})}
              placeholder="🎮"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Görev Tipi</Text>
            <View style={styles.pickerContainer}>
              {['games_played', 'correct_answers', 'score_earned', 'best_streak'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.pickerOption, form.task_type === type && styles.pickerOptionActive]}
                  onPress={() => setForm({...form, task_type: type})}
                >
                  <Text style={[styles.pickerOptionText, form.task_type === type && styles.pickerOptionTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Hedef</Text>
            <TextInput
              style={styles.input}
              value={form.target?.toString()}
              onChangeText={(v) => setForm({...form, target: parseInt(v) || 0})}
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ödül Puanı</Text>
            <TextInput
              style={styles.input}
              value={form.reward_points?.toString()}
              onChangeText={(v) => setForm({...form, reward_points: parseInt(v) || 0})}
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Aktif</Text>
            <Switch
              value={form.active}
              onValueChange={(v) => setForm({...form, active: v})}
              trackColor={{ false: colors.border, true: colors.success }}
            />
          </View>
          
          <View style={styles.formButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitButton} onPress={() => onSave(form)}>
              <Text style={styles.submitButtonText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    };

    if (taskLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📋 Günlük Görev Yönetimi</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => { setShowAddForm(true); setEditingTask(null); setNewTask({
              id: '', name: '', description: '', icon: '📋', 
              task_type: 'games_played', target: 1, 
              reward_points: 100, active: true
            }); }}
          >
            <Text style={styles.addButtonText}>+ Ekle</Text>
          </TouchableOpacity>
        </View>

        {(showAddForm || editingTask) && (
          <TaskForm 
            data={editingTask || newTask}
            onSave={saveTask}
            onCancel={() => { setShowAddForm(false); setEditingTask(null); }}
          />
        )}

        {tasks.map((task) => (
          <View key={task.id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemIcon}>{task.icon}</Text>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{task.name}</Text>
                <Text style={styles.itemDescription}>{task.description}</Text>
                <Text style={styles.itemMeta}>
                  {task.task_type}: {task.target} | Ödül: {task.reward_points} puan
                </Text>
              </View>
              <View style={[styles.statusBadge, task.active ? styles.activeBadge : styles.inactiveBadge]}>
                <Text style={styles.statusBadgeText}>{task.active ? 'Aktif' : 'Pasif'}</Text>
              </View>
            </View>
            <View style={styles.itemActions}>
              <TouchableOpacity style={styles.editButton} onPress={() => setEditingTask(task)}>
                <Text style={styles.editButtonText}>✏️ Düzenle</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={() => deleteTask(task.id)}>
                <Text style={styles.deleteButtonText}>🗑️ Sil</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralSettings />;
      case 'game':
        return <GameSettings />;
      case 'scoring':
        return <ScoringSettings />;
      case 'achievements':
        return <AchievementsManagement />;
      case 'dailyTasks':
        return <DailyTasksManagement />;
      case 'security':
        return <SecuritySettings />;
      case 'smtp':
        return <SMTPSettings />;
      default:
        return <GeneralSettings />;
    }
  };

  return (
    <SafeAreaView style={[globalStyles.safeArea, styles.fullScreenContainer]}>
      <SettingsHistoryModal />
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
        {/* Header */}
        <GradientView 
          colors={[colors.primary, colors.secondary]} 
          style={styles.header}
        >
          <Text style={styles.title}>⚙️ Admin Panel</Text>
          <Text style={styles.subtitle}>
            Sistem ayarlarını yönetin ve istatistikleri görüntüleyin
          </Text>
        </GradientView>

        {/* İstatistikler */}
        <AdminStatsCard />

        {/* Hızlı İşlemler */}
        <QuickActions />

        {/* Tab Navigation */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.tabs}
          contentContainerStyle={styles.tabsContent}
        >
          {[
            { key: 'general', label: '🌐 Genel', icon: '🌐' },
            { key: 'game', label: '🎮 Oyun', icon: '🎮' },
            { key: 'scoring', label: '⭐ Puanlama', icon: '⭐' },
            { key: 'achievements', label: '🏆 Başarımlar', icon: '🏆' },
            { key: 'dailyTasks', label: '📋 Görevler', icon: '📋' },
            { key: 'security', label: '🔒 Güvenlik', icon: '🔒' },
            { key: 'smtp', label: '📧 E-posta', icon: '📧' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.tabActive
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Seçili Tab İçeriği */}
        <View style={styles.tabContent}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Ayarlar yükleniyor...</Text>
            </View>
          ) : (
            renderTabContent()
          )}
        </View>

        {/* Kaydet Butonu */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveSettings}
          disabled={saving}
        >
          <GradientView
            colors={[colors.success, colors.gameSuccess]}
            style={styles.gradientButton}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Ayarları Kaydet</Text>
            )}
          </GradientView>
        </TouchableOpacity>

        {/* Alt Boşluk */}
        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

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
    textAlign: 'center',
    marginBottom: responsivePadding(5),
    width: '100%',
  },
  subtitle: {
    fontSize: responsiveFont(16),
    color: colors.textPrimary,
    opacity: 0.9,
    textAlign: 'center',
    width: '100%',
  },
  statsCard: {
    backgroundColor: colors.surface,
    margin: responsivePadding(20),
    padding: responsivePadding(25),
    borderRadius: 16,
    width: '100%',
    maxWidth: 800,
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
      },
    }),
  },
  statsTitle: {
    fontSize: responsiveFont(20),
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: responsivePadding(20),
    textAlign: 'center',
    width: '100%',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: responsivePadding(15),
    width: '100%',
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.card,
    padding: responsivePadding(20),
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: responsiveFont(24),
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: responsivePadding(5),
  },
  statLabel: {
    fontSize: responsiveFont(12),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  quickActions: {
    backgroundColor: colors.surface,
    margin: responsivePadding(20),
    padding: responsivePadding(25),
    borderRadius: 16,
    width: '100%',
    maxWidth: 800,
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
      },
    }),
  },
  sectionTitle: {
    fontSize: responsiveFont(20),
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: responsivePadding(20),
    width: '100%',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: responsivePadding(15),
    width: '100%',
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.card,
    padding: responsivePadding(20),
    borderRadius: 12,
    alignItems: 'center',
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
      },
    }),
  },
  actionEmoji: {
    fontSize: responsiveFont(24),
    marginBottom: responsivePadding(8),
  },
  actionText: {
    fontSize: responsiveFont(14),
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  tabs: {
    width: '100%',
    backgroundColor: colors.surface,
    paddingVertical: responsivePadding(10),
  },
  tabsContent: {
    paddingHorizontal: responsivePadding(20),
  },
  tab: {
    paddingHorizontal: responsivePadding(20),
    paddingVertical: responsivePadding(12),
    borderRadius: 8,
    marginHorizontal: responsivePadding(5),
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
  tabContent: {
    padding: responsivePadding(20),
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
  },
  section: {
    backgroundColor: colors.surface,
    padding: responsivePadding(25),
    borderRadius: 16,
    marginBottom: responsivePadding(20),
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      },
    }),
  },
  inputGroup: {
    marginBottom: responsivePadding(20),
    width: '100%',
  },
  label: {
    fontSize: responsiveFont(16),
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: responsivePadding(8),
    width: '100%',
  },
  input: {
    borderWidth: 2,
    borderColor: colors.cardLight,
    padding: responsivePadding(15),
    borderRadius: 12,
    fontSize: responsiveFont(16),
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    width: '100%',
  },
  switchGroup: {
    marginBottom: responsivePadding(20),
    width: '100%',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: responsivePadding(5),
    width: '100%',
  },
  switchLabel: {
    fontSize: responsiveFont(16),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  switchDescription: {
    fontSize: responsiveFont(12),
    color: colors.textSecondary,
    lineHeight: 18,
  },
  optionGroup: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    width: '100%',
  },
  optionButton: {
    flex: 1,
    paddingVertical: responsivePadding(12),
    alignItems: 'center',
    borderRadius: 8,
  },
  optionButtonActive: {
    backgroundColor: colors.primary,
  },
  optionText: {
    fontSize: responsiveFont(14),
    fontWeight: '600',
    color: colors.textSecondary,
  },
  optionTextActive: {
    color: colors.textPrimary,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: responsivePadding(40),
    width: '100%',
  },
  loadingText: {
    fontSize: responsiveFont(16),
    color: colors.textSecondary,
    marginTop: responsivePadding(15),
    textAlign: 'center',
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: responsivePadding(20),
    marginHorizontal: responsivePadding(20),
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
  },
  gradientButton: {
    paddingVertical: responsivePadding(16),
    alignItems: 'center',
    width: '100%',
  },
  buttonText: {
    fontSize: responsiveFont(18),
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  button: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 200,
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    width: '90%',
    maxWidth: 600,
    maxHeight: '80%',
    padding: responsivePadding(20),
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: responsivePadding(15),
    paddingBottom: responsivePadding(15),
    borderBottomWidth: 1,
    borderBottomColor: colors.cardLight,
  },
  modalTitle: {
    fontSize: responsiveFont(20),
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  modalCloseButton: {
    fontSize: responsiveFont(24),
    color: colors.textSecondary,
    padding: responsivePadding(5),
  },
  modalContent: {
    marginVertical: responsivePadding(10),
    maxHeight: 400,
  },
  modalLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: responsivePadding(40),
  },
  modalEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: responsivePadding(40),
  },
  modalEmptyText: {
    fontSize: responsiveFont(16),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  historyItem: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: responsivePadding(12),
    marginBottom: responsivePadding(10),
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: responsivePadding(10),
  },
  historyItemUser: {
    fontSize: responsiveFont(14),
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: responsivePadding(4),
  },
  historyItemDate: {
    fontSize: responsiveFont(12),
    color: colors.textSecondary,
  },
  historyItemSection: {
    marginTop: responsivePadding(8),
    paddingTop: responsivePadding(8),
    borderTopWidth: 1,
    borderTopColor: colors.cardLight,
  },
  historyItemSectionTitle: {
    fontSize: responsiveFont(12),
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: responsivePadding(4),
  },
  historyItemContent: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: responsivePadding(8),
  },
  historyItemText: {
    fontSize: responsiveFont(11),
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  rollbackButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: responsivePadding(12),
    paddingVertical: responsivePadding(8),
    borderRadius: 8,
  },
  rollbackButtonText: {
    fontSize: responsiveFont(12),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalCloseButtonFull: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: responsivePadding(12),
    marginTop: responsivePadding(15),
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: responsiveFont(16),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  // Başarım ve Görev Yönetimi Stilleri
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: responsivePadding(15),
  },
  addButton: {
    backgroundColor: colors.success,
    paddingHorizontal: responsivePadding(15),
    paddingVertical: responsivePadding(8),
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: responsiveFont(14),
  },
  formContainer: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: responsivePadding(15),
    marginBottom: responsivePadding(15),
  },
  formTitle: {
    fontSize: responsiveFont(18),
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: responsivePadding(15),
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    backgroundColor: colors.background,
    paddingHorizontal: responsivePadding(10),
    paddingVertical: responsivePadding(6),
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pickerOptionText: {
    fontSize: responsiveFont(11),
    color: colors.textSecondary,
  },
  pickerOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: responsivePadding(15),
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.border,
    paddingVertical: responsivePadding(12),
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: responsivePadding(12),
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  itemCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: responsivePadding(15),
    marginBottom: responsivePadding(10),
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemIcon: {
    fontSize: 32,
    marginRight: responsivePadding(12),
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: responsiveFont(16),
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  itemDescription: {
    fontSize: responsiveFont(12),
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemMeta: {
    fontSize: responsiveFont(10),
    color: colors.textMuted,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: responsivePadding(8),
    paddingVertical: responsivePadding(4),
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: colors.success + '30',
  },
  inactiveBadge: {
    backgroundColor: colors.border,
  },
  statusBadgeText: {
    fontSize: responsiveFont(10),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: responsivePadding(12),
    paddingTop: responsivePadding(12),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  editButton: {
    flex: 1,
    backgroundColor: colors.primary + '20',
    paddingVertical: responsivePadding(8),
    borderRadius: 6,
    alignItems: 'center',
  },
  editButtonText: {
    color: colors.primary,
    fontSize: responsiveFont(12),
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: colors.error + '20',
    paddingVertical: responsivePadding(8),
    borderRadius: 6,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: colors.error,
    fontSize: responsiveFont(12),
    fontWeight: '600',
  },
});

export default AdminSettings;