// LoginScreen.js - TAM EKRAN UYUMLU GÜNCELLENMİŞ VERSİYON
import React, { useState, useContext } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, Dimensions, SafeAreaView, StyleSheet
} from 'react-native';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { globalStyles, componentStyles } from '../styles/globalStyles';
import { colors } from '../utils/colors';
import Alert from '../utils/alert';
import { responsiveFont, responsivePadding } from '../utils/dimensions';

const { width, height } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const { signIn } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const doLogin = async () => {
    if (!email || !password) {
      Alert.alert('Uyarı', 'E-posta ve şifre gerekli.');
      return;
    }
    setLoading(true);
    try {
      console.log('🔐 1. Login başlıyor... URL:', api.defaults.baseURL);
      console.log('🔐 1b. Email:', email);
      
      // ✅ Doğrudan api.post kullan
      const res = await api.post('/api/auth/login', { email, password });
      
      console.log('🔐 2. API Response alındı:', res.status, res.data);
      
      if (!res.data?.token) {
        Alert.alert('Hata', 'Giriş başarısız. Token alınamadı.');
        return;
      }
      
      console.log('🔐 3. signIn fonksiyonu çağrılıyor...');
      
      // ✅ signIn fonksiyonunu await ile çağır
      await signIn(res.data.token, res.data.user);
      
      console.log('🔐 4. signIn tamamlandı! Yönlendirme bekleniyor...');
      
    } catch (err) {
      console.error('❌ 5. Login hatası:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        error: err.response?.data?.error,
        message: err.message,
        url: err.config?.url,
        baseURL: err.config?.baseURL
      });
      
      const errorMsg = err.response?.data?.error 
                    || err.message 
                    || 'Sunucuya bağlanılamadı';
      
      Alert.alert('Giriş Hatası', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.logo}>🎯</Text>
              <Text style={styles.title}>Akıllı Kelime Oyunu</Text>
              <Text style={styles.subtitle}>Zekanı Test Et</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.formTitle}>Giriş Yap</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>E-posta</Text>
                <TextInput 
                  placeholder="E-posta adresiniz" 
                  style={styles.input} 
                  value={email} 
                  onChangeText={setEmail} 
                  autoCapitalize="none" 
                  keyboardType="email-address"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Şifre</Text>
                <TextInput 
                  placeholder="Şifreniz" 
                  style={styles.input} 
                  value={password} 
                  onChangeText={setPassword} 
                  secureTextEntry 
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              
              <TouchableOpacity 
                style={styles.loginButton}
                onPress={doLogin} 
                disabled={loading}
              >
                {loading ? 
                  <ActivityIndicator color="#fff" /> : 
                  <Text style={styles.buttonText}>Giriş Yap</Text>
                }
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => navigation.navigate('Register')} 
                style={styles.registerLink}
              >
                <Text style={styles.linkText}>
                  Hesabın yok mu? <Text style={styles.linkBold}>Kayıt ol</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.primary,
    width: '100%',
  },
  keyboardAvoid: {
    flex: 1,
    width: '100%',
  },
  scrollContainer: {
    flexGrow: 1,
    width: '100%',
    minHeight: height,
  },
  container: {
    flex: 1,
    width: '100%',
    minHeight: height,
    alignItems: 'center',
    justifyContent: 'center',
    padding: responsivePadding(20),
  },
  header: {
    alignItems: 'center',
    marginBottom: responsivePadding(40),
    width: '100%',
  },
  logo: {
    fontSize: responsiveFont(60),
    marginBottom: responsivePadding(10),
  },
  title: {
    fontSize: responsiveFont(32),
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: responsivePadding(5),
  },
  subtitle: {
    fontSize: responsiveFont(18),
    color: colors.textPrimary,
    opacity: 0.9,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    width: '100%',
    maxWidth: 400,
    padding: responsivePadding(30),
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
      },
    }),
  },
  formTitle: {
    fontSize: responsiveFont(28),
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: responsivePadding(30),
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
  loginButton: {
    backgroundColor: colors.success,
    paddingVertical: responsivePadding(16),
    borderRadius: 12,
    alignItems: 'center',
    marginTop: responsivePadding(10),
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: colors.success,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: `0 4px 15px ${colors.success}40`,
      },
    }),
  },
  buttonText: {
    fontSize: responsiveFont(18),
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  registerLink: {
    marginTop: responsivePadding(25),
    alignItems: 'center',
    width: '100%',
  },
  linkText: {
    fontSize: responsiveFont(16),
    color: colors.textSecondary,
    textAlign: 'center',
  },
  linkBold: {
    fontWeight: 'bold',
    color: colors.primary,
  },
});

export default LoginScreen;