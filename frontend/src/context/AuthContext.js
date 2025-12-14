// frontend/src/context/AuthContext.js - GÜNCELLENMİŞ
import React, { createContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import eventBus from '../services/EventBus';

export const AuthContext = createContext({
  user: null,
  token: null,
  signIn: async () => {},
  signOut: async () => {},
  logout: async () => {},
  refreshUserData: async () => {},
  updateUserStats: async () => {},
  restored: false
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [restored, setRestored] = useState(false);

  // YENİ: Kullanıcı verisini güncelleme fonksiyonu
  const refreshUserData = useCallback(async () => {
    if (!token) return null;
    
    try {
      console.log('🔄 Kullanıcı verisi yenileniyor...');
      const response = await api.get('/api/auth/me');
      if (response.data && response.data.user) {
        const updatedUser = response.data.user;
        setUser(updatedUser);
        await AsyncStorage.setItem('auth_user', JSON.stringify(updatedUser));
        console.log('✅ Kullanıcı verisi güncellendi');
        return updatedUser;
      }
    } catch (error) {
      console.warn('❌ Kullanıcı verisi yenileme hatası:', error);
      // Fallback: verify endpoint'ini dene
      try {
        const verifyResponse = await api.get('/api/auth/verify');
        if (verifyResponse.data && verifyResponse.data.user) {
          const updatedUser = verifyResponse.data.user;
          setUser(updatedUser);
          await AsyncStorage.setItem('auth_user', JSON.stringify(updatedUser));
          return updatedUser;
        }
      } catch (verifyError) {
        console.warn('❌ Verify endpoint hatası:', verifyError);
      }
    }
    return null;
  }, [token]);

  // YENİ: İstatistik güncelleme fonksiyonu
  const updateUserStats = useCallback(async (newStats) => {
    if (!user) return;
    
    setUser(prevUser => {
      if (!prevUser) return prevUser;
      
      const updatedUser = {
        ...prevUser,
        statistics: {
          ...prevUser.statistics,
          ...newStats
        }
      };
      
      // AsyncStorage'a da kaydet
      AsyncStorage.setItem('auth_user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  }, [user]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔐 Auth sistem başlatılıyor...');
        await restoreAuth();
      } catch (error) {
        console.error('❌ Auth sistem başlatılamadı:', error);
        setRestored(true);
      }
    };

    initializeAuth();
    // Listen for global logout events (e.g., 401 from api)
    const off = eventBus.on('logout', () => {
      console.log('🔔 EventBus: logout received');
      signOut();
    });

    return () => { off && off(); };
  }, []);

  const restoreAuth = async () => {
    try {
      console.log('🔐 Auth restore başladı...');
      const storedToken = await AsyncStorage.getItem('auth_token');
      const storedUser = await AsyncStorage.getItem('auth_user');
      
      console.log('Stored Token:', !!storedToken);
      console.log('Stored User:', !!storedUser);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        // API instance'ına token'ı set et
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        
        console.log('✅ Token ve user restore edildi');
        
        // YENİ: Kullanıcı verisini güncelle
        setTimeout(() => {
          refreshUserData();
        }, 1000);
      }
    } catch (error) {
      console.error('Auth restore error:', error);
    } finally {
      setRestored(true);
      console.log('🔐 Auth restore tamamlandı');
    }
  };

  const signIn = async (newToken, newUser) => {
    try {
      console.log('🔐 Sign in işlemi:', newUser?.username);
      
      await AsyncStorage.setItem('auth_token', newToken);
      await AsyncStorage.setItem('auth_user', JSON.stringify(newUser || {}));
      
      setToken(newToken);
      setUser(newUser || null);
      
      // API instance'ına token'ı set et
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      console.log('✅ Sign in başarılı');
    } catch (error) {
      console.error('❌ Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('🔐 Sign out işlemi');
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('auth_user');
      
      setToken(null);
      setUser(null);
      
      // API'den token'ı kaldır
      delete api.defaults.headers.common['Authorization'];
      
      console.log('✅ Sign out başarılı');
    } catch (error) {
      console.error('❌ Sign out error:', error);
    }
  };

  const value = {
    user,
    token,
    signIn,
    signOut,
    logout: signOut,
    refreshUserData, // YENİ
    updateUserStats, // YENİ
    restored
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};