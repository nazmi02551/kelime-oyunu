// frontend/src/utils/responsive.js
import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Basit responsive değerler
export const getResponsiveSize = (size) => {
  if (width > 1000) return size * 1.3; // Büyük ekran
  if (width > 768) return size * 1.1;  // Tablet
  return size; // Mobil
};

export const getResponsiveFont = (size) => {
  if (width > 1000) return size * 1.4;
  if (width > 768) return size * 1.2;
  return size;
};

export const isTablet = width > 768;
export const isDesktop = width > 1000;