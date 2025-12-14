// frontend/src/styles/globalStyles.js
import { StyleSheet, Platform, StatusBar } from 'react-native';
import { 
  responsiveSize, 
  responsiveFont, 
  responsivePadding,
  IS_DESKTOP,
  IS_TABLET
} from '../utils/dimensions';
import { colors } from '../utils/colors';

// YARDIMCI: Gölge oluşturucu (Tekrarlayan kodları önlemek için)
const getShadowStyle = (level = 'medium', color = '#000') => {
  const styles = {
    small: {
      ios: { shadowOpacity: 0.2, shadowRadius: 1.41, shadowOffset: { width: 0, height: 1 } },
      android: { elevation: 2 },
      web: { boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }
    },
    medium: {
      ios: { shadowOpacity: 0.25, shadowRadius: 3.84, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 5 },
      web: { boxShadow: '0 2px 5px rgba(0,0,0,0.25)' }
    },
    large: {
      ios: { shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 8 },
      web: { boxShadow: '0 4px 8px rgba(0,0,0,0.3)' }
    }
  };
  
  const selected = styles[level] || styles.medium;
  
  return {
    ...Platform.select({
      ios: { ...selected.ios, shadowColor: color },
      android: { ...selected.android },
      web: { ...selected.web } // Web için renk ayarı gerekirse boxShadow string'i parse edilmeli
    })
  };
};



// 1. GLOBAL STİLLER (Temel Yapıtaşları)
export const globalStyles = StyleSheet.create({
  // --- Layout ---
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  fullScreen: {
    flex: 1, // width/height: 100% yerine flex: 1 daha performanslıdır
    backgroundColor: colors.background,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: responsivePadding(20),
  },
  scrollContainer: {
    flexGrow: 1,
    padding: responsivePadding(20),
  },

  // --- Cards & Surfaces ---
  card: {
    backgroundColor: colors.surface,
    padding: responsivePadding(20),
    borderRadius: 16,
    marginVertical: 10,
    ...getShadowStyle('large'), // Yeni helper kullanımı
  },
  surface: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: responsivePadding(15),
    marginVertical: responsiveSize(10),
  },

  // --- Headers ---
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: responsivePadding(20),
    paddingVertical: responsivePadding(15),
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardLight,
  },

  // --- Text Styles ---
  title: {
    fontSize: responsiveFont(28),
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: responsiveFont(18),
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: responsiveFont(22),
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 20,
    marginBottom: 15,
  },
  label: {
    fontSize: responsiveFont(16),
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
    marginTop: 15,
  },
  bodyText: {
    fontSize: responsiveFont(16),
    color: colors.textSecondary,
    lineHeight: 24,
  },

  // --- Inputs ---
  input: {
    borderWidth: 2,
    borderColor: colors.cardLight,
    padding: responsivePadding(15),
    borderRadius: 12,
    fontSize: responsiveFont(16),
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    marginBottom: 15,
  },

  // --- Buttons ---
  button: {
    paddingVertical: responsivePadding(15),
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    ...getShadowStyle('medium'),
  },
  // Renk varyasyonları
  buttonPrimary: { backgroundColor: colors.primary },
  buttonSuccess: { backgroundColor: colors.success },
  buttonWarning: { backgroundColor: colors.warning },
  buttonError: { backgroundColor: colors.error },
  buttonSecondary: { backgroundColor: colors.secondary },
  
  buttonText: {
    color: colors.textPrimary,
    fontSize: responsiveFont(18),
    fontWeight: 'bold',
  },
  buttonSmall: {
    paddingVertical: responsivePadding(8),
    paddingHorizontal: responsivePadding(12),
    borderRadius: 8,
  },
  buttonSmallText: {
    color: colors.textPrimary,
    fontSize: responsiveFont(12),
    fontWeight: 'bold',
  },

  // --- Layout Helpers (Utility Classes) ---
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  column: { flexDirection: 'column' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  flex1: { flex: 1 }, // Yeni
  w100: { width: '100%' }, // Yeni: Sadece gerektiğinde kullanmak için
});

// 2. BİLEŞEN ÖZEL STİLLERİ (Modüler Yapı)
export const componentStyles = {
  game: StyleSheet.create({
    // YENİ SOL SIDEBAR STİLLERİ
// Ses ve başarım stilleri
achievementNotification: {
  position: 'absolute',
  top: 100,
  right: 20,
  backgroundColor: colors.surface,
  padding: 15,
  borderRadius: 12,
  borderLeftWidth: 4,
  borderLeftColor: colors.success,
  minWidth: 280,
  zIndex: 1000,
  ...getShadowStyle('large'),
},
achievementNotificationTitle: {
  fontSize: 16,
  fontWeight: 'bold',
  color: colors.textPrimary,
  marginBottom: 10,
  textAlign: 'center',
},
achievementNotificationItem: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 8,
  padding: 8,
  backgroundColor: colors.card,
  borderRadius: 8,
},
achievementNotificationIcon: {
  fontSize: 20,
  marginRight: 10,
},
achievementNotificationText: {
  flex: 1,
},
achievementNotificationName: {
  fontSize: 14,
  fontWeight: 'bold',
  color: colors.textPrimary,
  marginBottom: 2,
},
achievementNotificationDesc: {
  fontSize: 12,
  color: colors.textSecondary,
},
achievementCloseButton: {
  position: 'absolute',
  top: 10,
  right: 10,
  padding: 5,
},
achievementCloseText: {
  fontSize: 16,
  color: colors.textSecondary,
  fontWeight: 'bold',
},

sidebarSection: {
  marginBottom: 20,
  padding: 15,
  backgroundColor: colors.card,
  borderRadius: 12,
  borderLeftWidth: 4,
  borderLeftColor: colors.primary,
},
sidebarSectionTitle: {
  fontSize: 16,
  fontWeight: 'bold',
  color: colors.textPrimary,
  marginBottom: 12,
},
wordStats: {
  marginBottom: 15,
},
wordStatRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
},
wordStatLabel: {
  fontSize: 14,
  color: colors.textSecondary,
  fontWeight: '500',
},
wordStatValue: {
  fontSize: 14,
  fontWeight: 'bold',
  color: colors.textPrimary,
},
difficultyMedium: {
  color: colors.gameWarning,
},
statsGrid: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 15,
  gap: 8,
},
statBox: {
  flex: 1,
  alignItems: 'center',
  backgroundColor: colors.surface,
  padding: 10,
  borderRadius: 8,
},
statNumber: {
  fontSize: 18,
  fontWeight: 'bold',
  color: colors.textPrimary,
  marginBottom: 4,
},
correctStat: {
  color: colors.success,
},
wrongStat: {
  color: colors.error,
},
statLabel: {
  fontSize: 10,
  color: colors.textSecondary,
  textAlign: 'center',
},
progressSection: {
  marginTop: 10,
},
progressLabels: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 6,
},
progressLabel: {
  fontSize: 12,
  color: colors.textSecondary,
},
progressPercentage: {
  fontSize: 12,
  fontWeight: 'bold',
  color: colors.textPrimary,
},
progressBar: {
  height: 6,
  backgroundColor: colors.background,
  borderRadius: 3,
  overflow: 'hidden',
},
progressFill: {
  height: '100%',
  borderRadius: 3,
},
performanceGrid: {
  gap: 12,
},
performanceItem: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},
performanceLabel: {
  fontSize: 13,
  color: colors.textSecondary,
  flex: 1,
},
performanceValueContainer: {
  backgroundColor: colors.success + '20',
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
},
performanceValue: {
  fontSize: 13,
  fontWeight: 'bold',
  color: colors.textPrimary,
},
performanceGood: {
  color: colors.success,
},
performanceFast: {
  color: colors.gameWarning,
},
gameHistory: {
  gap: 8,
},
historyItem: {
  backgroundColor: colors.surface,
  padding: 10,
  borderRadius: 8,
},
historyMain: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},
historyWord: {
  fontSize: 13,
  fontWeight: '500',
  color: colors.textPrimary,
  flex: 1,
},
historyResult: {
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 6,
},
historyCorrect: {
  backgroundColor: colors.success + '30',
},
historyWrong: {
  backgroundColor: colors.error + '30',
},
historyResultText: {
  fontSize: 12,
  fontWeight: 'bold',
},
achievementsList: {
  gap: 10,
},
achievementItem: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: colors.surface,
  padding: 12,
  borderRadius: 8,
},
achievementIcon: {
  fontSize: 20,
  marginRight: 12,
},
achievementInfo: {
  flex: 1,
},
achievementName: {
  fontSize: 14,
  fontWeight: 'bold',
  color: colors.textPrimary,
  marginBottom: 6,
},
achievementProgress: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
},
achievementProgressText: {
  fontSize: 11,
  color: colors.textSecondary,
  minWidth: 30,
},
    sidebarSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: colors.card,
    borderRadius: 10,
  },
  sidebarSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  inGameStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  inGameStat: {
    flex: 1,
    alignItems: 'center',
  },
  inGameStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  inGameStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  questionHistory: {
    gap: 8,
  },
  questionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: colors.surface,
    borderRadius: 6,
  },
  questionNumber: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  questionResult: {
    fontSize: 14,
    fontWeight: 'bold',
    marginHorizontal: 10,
  },
  questionCorrect: {
    color: colors.success,
  },
  questionWrong: {
    color: colors.error,
  },
  questionPoints: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  performanceMetrics: {
    gap: 10,
  },
  metric: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
    leaderboardHeader: {
      marginBottom: 15,
      
    },
    periodSelector: {
      flexDirection: 'row',
      marginTop: 10,
      gap: 5,
    },
    periodButton: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: colors.card,
      borderRadius: 8,
      alignItems: 'center',
    },
    periodButtonActive: {
      backgroundColor: colors.primary,
    },
    periodButtonText: {
      fontSize: responsiveFont(12),
      color: colors.textPrimary,
      fontWeight: '600',
    },
    leaderboardList: {
      flex: 1,
      backgroundColor: colors.card,
    },
    leaderboardItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 15,
      backgroundColor: colors.card,
      borderRadius: 10,
      marginBottom: 8,
    },
    currentUserItem: {
      backgroundColor: colors.primary,
      borderWidth: 2,
      borderColor: colors.gameSuccess,
    },
    leaderboardRank: {
      width: 30,
      alignItems: 'center',
      
    },
    leaderboardRankText: {
      fontSize: responsiveFont(14),
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    leaderboardUser: {
      flex: 1,
      marginLeft: 10,
    },
    leaderboardUsername: {
      fontSize: responsiveFont(14),
      color: colors.textPrimary,
      fontWeight: '600',
    },
    currentUsername: {
      color: colors.textPrimary,
      fontWeight: 'bold',
    },
    leaderboardScore: {
      alignItems: 'flex-end',
    },
    leaderboardScoreText: {
      fontSize: responsiveFont(14),
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    
    welcomeCard: {
      width: '100%',
      maxWidth: IS_DESKTOP ? 600 : '100%',
      backgroundColor: colors.surface,
      padding: responsivePadding(15),
      borderRadius: 20,
      alignSelf: 'center',
      ...getShadowStyle('large'),
    },
    welcomeTitle: {
      fontSize: responsiveFont(26),
      fontWeight: 'bold',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 10,
    },
    welcomeSubtitle: {
      fontSize: responsiveFont(16),
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 30,
    },
    userStats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: 30,
    },
    statCard: { alignItems: 'center', flex: 1 },
    statNumber: {
      fontSize: responsiveFont(24),
      fontWeight: 'bold',
      color: colors.gamePrimary,
      marginBottom: 5,
    },
    statLabel: {
      fontSize: responsiveFont(12),
      color: colors.textSecondary,
      textAlign: 'center',
    },
    startButton: {
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 15,
      ...getShadowStyle('medium', colors.success),
    },
    gradientButton: {
      paddingVertical: responsivePadding(20),
      paddingHorizontal: responsivePadding(30),
      alignItems: 'center',
    },
    startButtonText: {
      fontSize: responsiveFont(20),
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 5,
    },
    startButtonSubtext: {
      fontSize: responsiveFont(14),
      color: colors.textPrimary,
      opacity: 0.8,
    },
    quickStartGrid: {
      flexDirection: IS_DESKTOP ? 'row' : 'column',
      marginBottom: 15,
      gap: 5,
    },
    quickStartButton: {
      flex: 1,
      backgroundColor: colors.card,
      padding: responsivePadding(20),
      borderRadius: 12,
      alignItems: 'center',
      minWidth: IS_DESKTOP ? 80 : 'auto',
      ...getShadowStyle('small'),
    },
    quickStartEmoji: { fontSize: responsiveFont(24), marginBottom: 8 },
    quickStartText: {
      fontSize: responsiveFont(16),
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    quickStartSubtext: { fontSize: responsiveFont(12), color: colors.textSecondary },
    bottomMenu: {
      flexDirection: IS_DESKTOP ? 'row' : 'column',
      gap: 10,
    },
    menuButton: {
      flex: 1,
      backgroundColor: colors.card,
      padding: responsivePadding(15),
      borderRadius: 10,
      alignItems: 'center',
      minWidth: IS_DESKTOP ? 120 : 'auto',
    },
    menuButtonText: {
      fontSize: responsiveFont(14),
      fontWeight: '600',
      color: colors.textPrimary,
    },
    logoutButton: { backgroundColor: colors.error },
    
    // Game Header & Content
    header: { paddingVertical: responsivePadding(10) },
    headerContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: responsivePadding(20),
    },
    headerTitle: { fontSize: responsiveFont(20), fontWeight: 'bold', color: colors.textPrimary },
    headerSubtitle: { fontSize: responsiveFont(14), color: colors.textPrimary, opacity: 0.8 },
    headerActions: { flexDirection: 'row', gap: 10 },
    headerButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerButtonDanger: { backgroundColor: colors.error },
    headerButtonText: { fontSize: responsiveFont(16), color: colors.textPrimary },
    
    mainContent: { flex: 1 },
    mainContentWithSidebar: { maxWidth: 800, alignSelf: 'center' },
    
    sidebar: {
      width: 300,
      backgroundColor: colors.surface,
      borderLeftWidth: 1,
      borderLeftColor: colors.cardLight,
    },
    sidebarHeader: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.cardLight,
    },
    sidebarTab: { flex: 1, padding: responsivePadding(15), alignItems: 'center' },
    sidebarTabActive: {
      backgroundColor: colors.card,
      borderBottomWidth: 2,
      borderBottomColor: colors.primary,
    },
    sidebarTabText: { fontSize: responsiveFont(14), fontWeight: '600', color: colors.textPrimary },
    sidebarContent: { padding: responsivePadding(15) },
    sidebarTitle: {
      fontSize: responsiveFont(16),
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 15,
    },
    
    content: { flex: 1, padding: responsivePadding(20) },
    timerWarning: {
      backgroundColor: colors.error,
      padding: responsivePadding(15),
      borderRadius: 10,
      alignItems: 'center',
      marginBottom: 20,
    },
    timerText: { fontSize: responsiveFont(16), fontWeight: 'bold', color: colors.textPrimary },
    mobileStats: { marginBottom: 20 },
    
    // Difficulty & Stats
    difficultyIndicator: {
      backgroundColor: colors.card,
      padding: responsivePadding(15),
      borderRadius: 10,
      marginBottom: 15,
    },
    difficultyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    difficultyTitle: { fontSize: responsiveFont(14), fontWeight: '600', color: colors.textSecondary },
    difficultyLevel: { fontSize: responsiveFont(14), fontWeight: 'bold' },
    difficultyBar: {
      height: 6,
      backgroundColor: colors.background,
      borderRadius: 3,
      overflow: 'hidden',
      marginBottom: 8,
    },
    difficultyFill: { height: '100%', borderRadius: 3 },
    difficultyModifier: { fontSize: responsiveFont(12), color: colors.textSecondary, textAlign: 'center' },
    
    statsWidget: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      padding: responsivePadding(15),
      borderRadius: 10,
      marginBottom: 15,
    },
    statItem: { flex: 1, alignItems: 'center' },
    statItemLabel: { fontSize: responsiveFont(10), color: colors.textSecondary, marginBottom: 4 },
    statItemValue: { fontSize: responsiveFont(14), fontWeight: 'bold', color: colors.textPrimary },
    
    // Game Mechanics
    revealedSection: { marginTop: 15 },
    revealedTitle: {
      fontSize: responsiveFont(14),
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    lettersGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    letterChip: {
      backgroundColor: colors.primary,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 15,
    },
    letterChipText: { fontSize: responsiveFont(12), fontWeight: 'bold', color: colors.textPrimary },
    
    leaderboardPlaceholder: {
      padding: responsivePadding(20),
      backgroundColor: colors.card,
      borderRadius: 10,
      alignItems: 'center',
    },
    placeholderText: { fontSize: responsiveFont(14), color: colors.textSecondary, textAlign: 'center' },
    
    gameInfo: { alignItems: 'center' },
    infoCards: { flexDirection: 'row', marginBottom: 20, gap: 10 },
    infoCard: {
      flex: 1,
      backgroundColor: colors.card,
      padding: responsivePadding(15),
      borderRadius: 10,
      alignItems: 'center',
      minWidth: 80,
    },
    infoCardLabel: { fontSize: responsiveFont(12), color: colors.textSecondary, marginBottom: 5 },
    infoCardValue: { fontSize: responsiveFont(18), fontWeight: 'bold', color: colors.textPrimary },
    questionInfo: {
      fontSize: responsiveFont(20),
      fontWeight: '600',
      color: colors.warning,
      textAlign: 'center',
      marginBottom: 20,
    },
    wordDisplay: {
      backgroundColor: colors.accent,
      paddingVertical: responsivePadding(30),
      paddingHorizontal: responsivePadding(40),
      borderRadius: 15,
      marginBottom: 15,
      ...getShadowStyle('medium'),
    },
    wordText: {
      fontSize: responsiveFont(36),
      fontWeight: 'bold',
      letterSpacing: responsiveSize(8),
      color: colors.gamePrimary,
      textAlign: 'center',
    },
    hintText: {
      fontSize: responsiveFont(16),
      color: colors.textSecondary,
      fontStyle: 'italic',
      textAlign: 'center',
    },
    
    controls: {
      padding: responsivePadding(20),
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.cardLight,
    },
    controlButtons: { flexDirection: 'row', gap: 10 },
    controlButton: { flex: 1, borderRadius: 12, overflow: 'hidden' },
    gradientButtonSmall: { paddingVertical: responsivePadding(15), alignItems: 'center' },
    controlButtonText: {
      fontSize: responsiveFont(16),
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 4,
    },
    controlButtonSubtext: { fontSize: responsiveFont(12), color: colors.textPrimary, opacity: 0.8 },
    
    guessMode: { gap: 10 },
    guessInput: {
      backgroundColor: colors.card,
      padding: responsivePadding(15),
      borderRadius: 12,
      fontSize: responsiveFont(20),
      color: colors.textPrimary,
      textAlign: 'center',
      borderWidth: 2,
      borderColor: colors.primary,
    },
    submitButton: { borderRadius: 12, overflow: 'hidden' },
    submitButtonText: { fontSize: responsiveFont(16), fontWeight: 'bold', color: colors.textPrimary },
    
    wordRevealContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      // minHeight: height * 0.8, // Bu gereksiz olabilir flex:1 varsa
    },
    wordRevealTitle: {
      fontSize: responsiveFont(32),
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 20,
      textAlign: 'center',
    },
    wordRevealWord: {
      fontSize: responsiveFont(48),
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 20,
      textAlign: 'center',
    },
    wordRevealSubtitle: {
      fontSize: responsiveFont(18),
      color: colors.textPrimary,
      opacity: 0.8,
      textAlign: 'center',
    },
  }),

  auth: StyleSheet.create({
    container: { flex: 1 },
    background: { flex: 1, justifyContent: 'center' },
    card: {
      width: '100%',
      maxWidth: 400,
      alignSelf: 'center',
      marginHorizontal: 20,
    },
    logo: { fontSize: responsiveFont(40), textAlign: 'center', marginBottom: 10 },
    title: {
      fontSize: responsiveFont(28),
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 30,
    },
    input: {
      borderWidth: 2,
      borderColor: colors.cardLight,
      padding: responsivePadding(15),
      borderRadius: 12,
      fontSize: responsiveFont(16),
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      marginBottom: 15,
    },
    button: { borderRadius: 12, overflow: 'hidden', marginTop: 10 },
    gradientButton: { paddingVertical: responsivePadding(15), alignItems: 'center' },
    buttonText: { fontSize: responsiveFont(18), fontWeight: 'bold', color: colors.textPrimary },
    link: { marginTop: 20, alignItems: 'center' },
    linkText: { fontSize: responsiveFont(16), color: colors.primary, fontWeight: '500' },
    error: {
      backgroundColor: colors.error,
      padding: responsivePadding(10),
      borderRadius: 8,
      marginBottom: 15,
    },
    errorText: {
      color: colors.textPrimary,
      fontSize: responsiveFont(14),
      textAlign: 'center',
    },
  }),

  profile: StyleSheet.create({
    container: { flex: 1 },
    header: { paddingVertical: responsivePadding(20), alignItems: 'center' },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 15,
    },
    avatarText: { fontSize: responsiveFont(32), fontWeight: 'bold', color: colors.textPrimary },
    username: {
      fontSize: responsiveFont(24),
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 5,
      textAlign: 'center',
    },
    email: { fontSize: responsiveFont(16), color: colors.textSecondary, textAlign: 'center' },
    stats: {
      flexDirection: 'row',
      padding: responsivePadding(20),
      gap: 10,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      padding: responsivePadding(15),
      borderRadius: 10,
      alignItems: 'center',
      minWidth: 80,
      maxWidth: 120,
    },
    statNumber: {
      fontSize: responsiveFont(20),
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 5,
    },
    statLabel: { fontSize: responsiveFont(12), color: colors.textSecondary, textAlign: 'center' },
    section: { marginBottom: 20 },
    sectionTitle: {
      fontSize: responsiveFont(18),
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 15,
      paddingHorizontal: responsivePadding(20),
    },
    form: { paddingHorizontal: responsivePadding(20) },
    inputGroup: { marginBottom: 15 },
    label: {
      fontSize: responsiveFont(14),
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.cardLight,
      padding: responsivePadding(12),
      borderRadius: 8,
      fontSize: responsiveFont(16),
      backgroundColor: colors.surface,
      color: colors.textPrimary,
    },
    saveButton: { borderRadius: 12, overflow: 'hidden', marginTop: 20 },
    gradientButton: { paddingVertical: responsivePadding(15), alignItems: 'center' },
    buttonText: { fontSize: responsiveFont(16), fontWeight: 'bold', color: colors.textPrimary },
    adaptiveCard: {
      backgroundColor: colors.surface,
      padding: responsivePadding(20),
      borderRadius: 12,
      marginBottom: 15,
    },
    adaptiveHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    adaptiveTitle: { fontSize: responsiveFont(16), fontWeight: 'bold', color: colors.textPrimary },
    adaptiveLevel: { fontSize: responsiveFont(14), fontWeight: 'bold' },
  }),

  admin: StyleSheet.create({
    container: { flex: 1 },
    header: {
      paddingVertical: responsivePadding(25),
      paddingHorizontal: responsivePadding(20),
      alignItems: 'center',
    },
    title: {
      fontSize: responsiveFont(28),
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: responsiveFont(14),
      color: colors.textPrimary,
      opacity: 0.9,
      textAlign: 'center',
    },
    statsCard: {
      backgroundColor: colors.surface,
      margin: responsivePadding(20),
      padding: responsivePadding(20),
      borderRadius: 16,
      ...getShadowStyle('medium'),
    },
    statsTitle: {
      fontSize: responsiveFont(18),
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 15,
    },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    statItem: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: colors.card,
      padding: responsivePadding(15),
      borderRadius: 10,
      alignItems: 'center',
    },
    statNumber: {
      fontSize: responsiveFont(20),
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 5,
    },
    statLabel: { fontSize: responsiveFont(12), color: colors.textSecondary, textAlign: 'center' },
    form: { padding: responsivePadding(20) },
    inputGroup: { marginBottom: 20 },
    label: {
      fontSize: responsiveFont(16),
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.cardLight,
      padding: responsivePadding(12),
      borderRadius: 8,
      fontSize: responsiveFont(16),
      backgroundColor: colors.surface,
      color: colors.textPrimary,
    },
    section: { marginBottom: 30 },
    sectionTitle: {
      fontSize: responsiveFont(18),
      fontWeight: 'bold',
      color: colors.textPrimary,
      marginBottom: 15,
    },
    saveButton: { borderRadius: 12, overflow: 'hidden', marginTop: 20 },
    gradientButton: { paddingVertical: responsivePadding(15), alignItems: 'center' },
    buttonText: { fontSize: responsiveFont(16), fontWeight: 'bold', color: colors.textPrimary },
  }),
};

// 3. UTILITY FONKSİYONLARI (Kısayollar)
// Bu kısım temizlendi, sadece gerçekten gerekli olanlar bırakıldı.
export const styleHelpers = {
  shadowSmall: getShadowStyle('small'),
  shadowMedium: getShadowStyle('medium'),
  shadowLarge: getShadowStyle('large'),
  
  borderPrimary: { borderWidth: 1, borderColor: colors.primary },
  bgPrimary: { backgroundColor: colors.primary },
  textPrimary: { color: colors.textPrimary },
  
  flex1: { flex: 1 },
  flexRow: { flexDirection: 'row' },
  itemsCenter: { alignItems: 'center' },
  justifyCenter: { justifyContent: 'center' },
  selfCenter: { alignSelf: 'center' },
  
  hidden: { display: 'none' },
  visible: { display: 'flex' },
};

// Responsive utility fonksiyonları (Aynen korundu)
export const responsiveUtils = {
  font: (size) => responsiveFont(size),
  size: (size) => responsiveSize(size),
  padding: (size) => responsivePadding(size),
  isTablet: IS_TABLET,
  isDesktop: IS_DESKTOP,
  width: (percent) => ({ width: `${percent}%` }),
  height: (percent) => ({ height: `${percent}%` }),
};

export default globalStyles;