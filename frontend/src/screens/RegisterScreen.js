// frontend/src/screens/RegisterScreen.js - TAM EKRAN UYUMLU GÜNCELLENMİŞ VERSİYON
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  SafeAreaView
} from 'react-native';
import api from '../services/api';
import { Picker } from '@react-native-picker/picker';
import { responsiveSize, responsiveFont, responsivePadding } from '../utils/dimensions';
import { colors } from '../utils/colors';
import Alert from '../utils/alert';

const { width, height } = Dimensions.get('window');

const RegisterScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [education, setEducation] = useState('');
  const [difficulty, setDifficulty] = useState('static');
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingCats, setFetchingCats] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setFetchingCats(true);
    try {
      const res = await api.get('/api/categories/list');
      setCategories(res.data.categories || []);
    } catch (err) {
      console.warn(err);
      setCategories([]);
    } finally {
      setFetchingCats(false);
    }
  };

  const toggleCategory = (cat) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const doRegister = async () => {
    if (!username || !email || !password) {
      Alert.alert('Uyarı', 'Kullanıcı adı, e-posta ve şifre gerekli.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/register', {
        username,
        email,
        password,
        age_group: ageGroup,
        education_level: education,
        difficulty_preference: difficulty,
        categories: selectedCategories
      });
      Alert.alert('Başarılı', 'Kayıt başarılı. Giriş yapabilirsiniz.');
      navigation.navigate('Login');
    } catch (err) {
      Alert.alert('Hata', err.response?.data?.error || 'Kayıt başarısız.');
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
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.logo}>🧠</Text>
              <Text style={styles.title}>Hesap Oluştur</Text>
              <Text style={styles.subtitle}>Yeni macerana başla</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.formTitle}>Kayıt Ol</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Kullanıcı Adı</Text>
                <TextInput 
                  placeholder="Kullanıcı adınızı girin" 
                  style={styles.input} 
                  value={username} 
                  onChangeText={setUsername}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>E-posta</Text>
                <TextInput 
                  placeholder="ornek@email.com" 
                  style={styles.input} 
                  value={email} 
                  onChangeText={setEmail} 
                  keyboardType="email-address" 
                  autoCapitalize="none"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Şifre</Text>
                <TextInput 
                  placeholder="Şifrenizi girin" 
                  style={styles.input} 
                  value={password} 
                  onChangeText={setPassword} 
                  secureTextEntry 
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Yaş Grubu</Text>
                <TextInput 
                  placeholder="Ör: 25-34" 
                  style={styles.input} 
                  value={ageGroup} 
                  onChangeText={setAgeGroup}
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Eğitim Durumu</Text>
                <TextInput 
                  placeholder="Ör: lisans, yüksek lisans" 
                  style={styles.input} 
                  value={education} 
                  onChangeText={setEducation}
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Zorluk Tercihi</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={difficulty}
                    onValueChange={setDifficulty}
                    style={styles.picker}
                  >
                    <Picker.Item label="Sabit Zorluk (Static)" value="static" />
                    <Picker.Item label="Uyarlanabilir Zorluk (Adaptive)" value="adaptive" />
                  </Picker>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Kategoriler</Text>
                {fetchingCats ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Kategoriler yükleniyor...</Text>
                  </View>
                ) : (
                  <View style={styles.categoriesContainer}>
                    {categories.length === 0 ? (
                      <Text style={styles.noCategories}>Kategori bulunamadı</Text>
                    ) : (
                      <View style={styles.categoriesGrid}>
                        {categories.map(cat => (
                          <TouchableOpacity 
                            key={cat} 
                            style={[
                              styles.categoryButton,
                              selectedCategories.includes(cat) && styles.categoryButtonSelected
                            ]} 
                            onPress={() => toggleCategory(cat)}
                          >
                            <Text style={[
                              styles.categoryText,
                              selectedCategories.includes(cat) && styles.categoryTextSelected
                            ]}>
                              {cat}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>

              <TouchableOpacity style={styles.registerButton} onPress={doRegister} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Hesap Oluştur</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginLink}>
                <Text style={styles.linkText}>Zaten hesabın var mı? Giriş yap</Text>
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
  scrollView: {
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
    alignItems: 'center',
    padding: responsivePadding(20),
    paddingBottom: responsivePadding(40),
  },
  header: {
    alignItems: 'center',
    marginBottom: responsivePadding(20),
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
    maxWidth: 500,
    padding: responsivePadding(25),
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
  pickerContainer: {
    borderWidth: 2,
    borderColor: colors.cardLight,
    borderRadius: 12,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  picker: {
    height: responsivePadding(50),
    color: colors.textPrimary,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: responsivePadding(20),
    backgroundColor: colors.card,
    borderRadius: 12,
  },
  loadingText: {
    fontSize: responsiveFont(16),
    color: colors.textSecondary,
    marginTop: responsivePadding(10),
    textAlign: 'center',
  },
  categoriesContainer: {
    width: '100%',
  },
  noCategories: {
    fontSize: responsiveFont(16),
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    padding: responsivePadding(20),
    backgroundColor: colors.card,
    borderRadius: 12,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: responsivePadding(10),
    width: '100%',
  },
  categoryButton: {
    paddingVertical: responsivePadding(10),
    paddingHorizontal: responsivePadding(15),
    borderRadius: 25,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  categoryButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    fontSize: responsiveFont(14),
    color: colors.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
  categoryTextSelected: {
    color: colors.textPrimary,
  },
  registerButton: {
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
  loginLink: {
    marginTop: responsivePadding(25),
    alignItems: 'center',
    width: '100%',
  },
  linkText: {
    fontSize: responsiveFont(16),
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default RegisterScreen;