import { Dimensions, Platform, PixelRatio } from 'react-native';

// İlk yükleme anındaki boyutlar
let { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Web için dinamik listener (Pencere boyutu değişirse değerleri günceller)
Dimensions.addEventListener('change', ({ window }) => {
  SCREEN_WIDTH = window.width;
  SCREEN_HEIGHT = window.height;
});

// Yardımcı Fonksiyonlar (Dinamik Kontrol)
export const isTablet = () => {
  const dim = Dimensions.get('window');
  return dim.width >= 768;
};

export const isDesktop = () => {
  const dim = Dimensions.get('window');
  return dim.width >= 1024;
};

// Geriye dönük uyumluluk için statik sabitler (Diğer dosyalarınız bozulmasın diye tutuyoruz)
export const IS_TABLET = SCREEN_WIDTH >= 768;
export const IS_DESKTOP = SCREEN_WIDTH >= 1024;
export const IS_MOBILE = SCREEN_WIDTH < 768;
export const IS_SMALL_DEVICE = SCREEN_WIDTH < 360;

const BASE_WIDTH = 375;

export const responsiveFont = (size) => {
  const { width: currentWidth } = Dimensions.get('window');
  
  // WEB VE MASAÜSTÜ İÇİN ÖZEL KORUMA (CLAMP)
  if (Platform.OS === 'web' || Platform.OS === 'windows' || Platform.OS === 'macos') {
    // Masaüstünde fontlar mobil mantığıyla büyürse devasa olur. 
    // Bunu engellemek için maksimum bir sınır koyuyoruz.
    if (currentWidth >= 1024) {
      // Masaüstünde orijinal boyuttan en fazla %30 büyük olsun, sonsuza kadar büyümesin
      return Math.min(size * 1.3, size + 6);
    }
    if (currentWidth >= 768) {
      return Math.min(size * 1.2, size + 4);
    }
    return size; // Mobilde web görünümü standart kalsın
  }

  // MOBİL UYGULAMA MANTIĞI (Orijinal Kodunuz)
  if (IS_TABLET) {
    return size * 1.1;
  }
  
  const scale = currentWidth / BASE_WIDTH;
  const newSize = size * scale;
  
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  } else {
    return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 1;
  }
};

export const responsiveSize = (size) => {
  const { width: currentWidth } = Dimensions.get('window');
  if (currentWidth >= 1024) return size; // Masaüstünde dev butonlar olmasın
  if (currentWidth >= 768) return size * 1.1;
  return size; 
};

export const responsivePadding = (size) => {
  const { width: currentWidth } = Dimensions.get('window');
  if (currentWidth >= 1024) return size * 1.2; // Masaüstünde biraz daha ferah
  if (currentWidth >= 768) return size * 1.1;
  return size;
};

export { SCREEN_WIDTH, SCREEN_HEIGHT };