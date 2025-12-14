// frontend/src/utils/colors.js
export const colors = {
  // Modern Gradient Colors
  primary: '#667eea',
  primaryDark: '#764ba2',
  secondary: '#f093fb',
  secondaryDark: '#f5576c',
  accent: '#4facfe',
  accentDark: '#00f2fe',
  
  // Game Colors
  gamePrimary: '#ff6b6b',
  gameSecondary: '#48dbfb',
  gameSuccess: '#1dd1a1',
  gameWarning: '#feca57',
  gameDanger: '#ff9ff3',
  
  // UI Colors
  background: '#0f0f23',
  surface: '#1a1a2e',
  card: '#16213e',
  cardLight: '#2d3047',
  
  // Text Colors
  textPrimary: '#ffffff',
  textSecondary: '#b8b8d0',
  textMuted: '#6c757d',
  textDark: '#2d3047',
  
  // Status Colors
  success: '#10ac84',
  warning: '#ee5a24',
  error: '#ed4c67',
  info: '#2e86de',
  danger: '#ff6b6b',
  border: '#3a3a52',
  
  // Social Colors
  facebook: '#1877f2',
  google: '#db4437',
  twitter: '#1da1f2'
};

export const gradients = {
  primary: ['#667eea', '#764ba2'],
  secondary: ['#f093fb', '#f5576c'],
  success: ['#1dd1a1', '#10ac84'],
  warning: ['#feca57', '#ee5a24'],
  danger: ['#ff6b6b', '#ee5a52'],
  dark: ['#2d3047', '#1a1a2e'],
  ocean: ['#4facfe', '#00f2fe'],
  sunset: ['#fa709a', '#fee140']
};

// Theme definitions for ThemeContext
export const themes = {
  dark: {
    colors: {
      primary: '#667eea',
      secondary: '#f093fb',
      accent: '#4facfe',
      background: '#0f0f23',
      surface: '#1a1a2e',
      card: '#16213e',
      text: '#ffffff',
      textSecondary: '#b8b8d0',
      border: '#3a3a52',
      success: '#10ac84',
      warning: '#ee5a24',
      error: '#ed4c67',
      info: '#2e86de',
    }
  },
  light: {
    colors: {
      primary: '#667eea',
      secondary: '#f093fb',
      accent: '#4facfe',
      background: '#f5f5f5',
      surface: '#ffffff',
      card: '#ffffff',
      text: '#2d3047',
      textSecondary: '#6c757d',
      border: '#e0e0e0',
      success: '#10ac84',
      warning: '#ee5a24',
      error: '#ed4c67',
      info: '#2e86de',
    }
  }
};