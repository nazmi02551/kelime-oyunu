// frontend/src/context/AuthContext.js - GÜNCELLENMİŞ
import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';
import api from '../services/api';
import socketService from '../services/SocketService';
import eventBus from '../services/EventBus';

// Web-compatible storage wrapper
const storage = {
  getItem: async (key) => localStorage.getItem(key),
  setItem: async (key, value) => localStorage.setItem(key, value),
  removeItem: async (key) => localStorage.removeItem(key),
  clear: async () => localStorage.clear()
};

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

// useAuth hook - export edildi
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

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
        await storage.setItem('user', JSON.stringify(updatedUser));
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
          await storage.setItem('user', JSON.stringify(updatedUser));
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
      
      // localStorage'a da kaydet
      storage.setItem('user', JSON.stringify(updatedUser));
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
      const storedToken = await storage.getItem('token');
      const storedUser = await storage.getItem('user');
      
      console.log('Stored Token:', !!storedToken);
      console.log('Stored User:', !!storedUser);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        // API instance'ına token'ı set et
        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        
        console.log('✅ Token ve user restore edildi');
        
        // WebSocket bağlantısını kur
        console.log('🔌 WebSocket bağlantısı kuruluyor...');
        socketService.connect();
        
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
      
      await storage.setItem('token', newToken);
      await storage.setItem('user', JSON.stringify(newUser || {}));
      
      setToken(newToken);
      setUser(newUser || null);
      
      // API instance'ına token'ı set et
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      // WebSocket bağlantısını kur
      console.log('🔌 WebSocket bağlantısı kuruluyor...');
      socketService.connect();
      
      console.log('✅ Sign in başarılı');
    } catch (error) {
      console.error('❌ Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('🔐 Sign out işlemi');
      await storage.removeItem('token');
      await storage.removeItem('user');
      // Clear old keys for backward compatibility
      await storage.removeItem('auth_token');
      await storage.removeItem('auth_user');
      await storage.removeItem('userId');
      
      setToken(null);
      setUser(null);
      
      // API'den token'ı kaldır
      delete api.defaults.headers.common['Authorization'];
      
      // WebSocket bağlantısını kes
      socketService.disconnect();
      
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