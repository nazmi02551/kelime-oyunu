// frontend/src/navigation/AppNavigator.js
import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import GameScreen from '../screens/GameScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AdminSettings from '../screens/AdminSettings';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import { AuthContext } from '../context/AuthContext';
import { responsiveSize, responsiveFont } from '../utils/dimensions';
import { colors } from '../utils/colors';

const Stack = createStackNavigator();

const AppNavigator = () => {
  const { user, restored } = useContext(AuthContext);

  // Restore işlemi bitene kadar loading göster
  if (!restored) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 20, color: colors.textPrimary }}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.primary,
          },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {!user ? (
          // Kullanıcı giriş yapmamışsa
          <>
            <Stack.Screen 
              name="Login" 
              component={LoginScreen} 
              options={{ 
                headerShown: false,
                animationTypeForReplace: user ? 'push' : 'pop'
              }} 
            />
            <Stack.Screen 
              name="Register" 
              component={RegisterScreen} 
              options={{ 
                headerShown: false 
              }} 
            />
          </>
        ) : (
          // Kullanıcı giriş yapmışsa
          <>
            <Stack.Screen 
              name="Game" 
              component={GameScreen} 
              options={{ 
                headerShown: false // GameScreen kendi header'ını kullanıyor
              }} 
            />
            <Stack.Screen 
              name="Profile" 
              component={ProfileScreen} 
              options={{ 
                title: '👤 Profilim',
                headerBackTitle: 'Geri'
              }} 
            />
            <Stack.Screen 
              name="Leaderboard" 
              component={LeaderboardScreen} 
              options={{ 
                title: '🏆 Liderlik Tablosu',
                headerBackTitle: 'Geri'
              }} 
            />
            <Stack.Screen 
              name="AdminSettings" 
              component={AdminSettings} 
              options={{ 
                title: '⚙️ Admin Ayarları',
                headerBackTitle: 'Geri'
              }} 
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;