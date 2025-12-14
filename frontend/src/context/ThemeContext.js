// frontend/src/context/ThemeContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes } from '../utils/colors';

export const ThemeContext = createContext({
  theme: themes.dark,
  mode: 'dark',
  toggleTheme: () => {},
  setMode: () => {}
});

// useTheme hook
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback if not wrapped in provider
    return {
      theme: themes.dark,
      mode: 'dark',
      toggleTheme: () => {},
      setMode: () => {}
    };
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const system = Appearance.getColorScheme();
  const [mode, setMode] = useState('dark');
  const [theme, setTheme] = useState(themes.dark);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('app_theme_mode');
        const initial = stored || system || 'dark';
        setMode(initial);
        setTheme(themes[initial] || themes.dark);
      } catch (e) {
        setMode(system || 'dark');
        setTheme(themes[system] || themes.dark);
      }
    })();
  }, [system]);

  const toggleTheme = async () => {
    const next = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    setTheme(themes[next]);
    try {
      await AsyncStorage.setItem('app_theme_mode', next);
    } catch (e) {}
  };

  const setModeAndPersist = async (m) => {
    setMode(m);
    setTheme(themes[m] || themes.dark);
    try {
      await AsyncStorage.setItem('app_theme_mode', m);
    } catch (e) {}
  };

  return (
    <ThemeContext.Provider value={{ theme, mode, toggleTheme, setMode: setModeAndPersist }}>
      {children}
    </ThemeContext.Provider>
  );
};
