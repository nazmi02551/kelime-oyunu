// frontend/src/App.js
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import AppNavigator from './navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';

// WEB İÇİN ÖZEL CSS - GÜNCELLENDİ
if (Platform.OS === 'web') {
  const style = document.createElement('style');
  style.textContent = `
    html, body, #root {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      overflow: auto; /* hidden yerine auto */
    }
    /* Scrollbar'ı güzelleştirelim */
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: #f1f1f1; }
    ::-webkit-scrollbar-thumb { background: #888; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #555; }
    
    /* Mobil görünüm için viewport ayarı */
    @media (max-width: 768px) {
      html, body, #root {
        min-height: 100vh;
        overflow-x: hidden;
      }
    }
  `;
  document.head.appendChild(style);
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          {/* Container düzeltildi */}
          <View style={styles.container}>
            <AppNavigator />
            <StatusBar style="light" />
          </View>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    // Web için viewport height kullan - ÇOK ÖNEMLİ
    ...(Platform.OS === 'web' && {
      minHeight: '100vh',
      width: '100vw',
    }),
  },
});