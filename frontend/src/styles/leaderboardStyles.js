import { StyleSheet, Platform } from 'react-native';
import { responsiveFont, responsivePadding, colors } from '../utils/dimensions'; // colors importunu düzelttim, path'e dikkat edin
// Eğer colors dimensions içinde değilse kendi path'inden import edin:
// import { colors } from '../utils/colors'; 

// Not: colors objesinin doğru import edildiğinden emin olun.
// Sizin kodunuzda utils/dimensions'dan geliyormuş gibi görünüyordu,
// eğer ayrı bir dosdaysa (../utils/colors) lütfen oradan import edin.
// Ben aşağıda sizin orijinal kodunuzdaki gibi varsayarak colors kullanımını koruyorum.

export const leaderboardStyles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor burada belirtilmesine gerek yok, main view'da var
  },
  header: {
    paddingVertical: responsivePadding(25),
    paddingHorizontal: responsivePadding(20),
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: responsiveFont(32),
    fontWeight: 'bold',
    // colors objesinin tanımlı olduğundan emin olun
    color: '#333', // Fallback renk, colors.textPrimary varsa onu kullanır
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: responsiveFont(16),
    color: '#666', // Fallback
    opacity: 0.9,
    textAlign: 'center',
    maxWidth: 600, // Sadece metin çok uzamasın diye
  },
  userRankCard: {
    margin: responsivePadding(20),
    padding: responsivePadding(20),
    borderRadius: 16,
    width: 'auto', // Genişliği parent belirleyecek
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
      }
    }),
  },
  userRankTitle: {
    fontSize: responsiveFont(18),
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  userRankMessage: {
    fontSize: responsiveFont(16),
    textAlign: 'center',
    marginBottom: 8,
  },
  userRankSubmessage: {
    fontSize: responsiveFont(14),
    textAlign: 'center',
  },
  userRankInfo: {
    // Flex direction dinamik olarak component içinde verilecek
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userRank: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  userRankNumber: {
    fontSize: responsiveFont(24),
    fontWeight: 'bold',
    marginRight: 10,
  },
  userRankText: {
    fontSize: responsiveFont(14),
    opacity: 0.9,
  },
  userStatsContainer: {
    alignItems: 'flex-end',
  },
  userStat: {
    fontSize: responsiveFont(14),
    marginBottom: 4,
  },
  filtersContainer: {
    paddingVertical: responsivePadding(15),
    width: '100%',
  },
  filters: {
    marginBottom: responsivePadding(10),
  },
  filtersContent: {
    paddingHorizontal: responsivePadding(20),
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: responsivePadding(15),
    paddingVertical: responsivePadding(10),
    borderRadius: 20,
    marginRight: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  filterButtonActive: {
    // backgroundColor: colors.primary, // Componentten gelecek
  },
  filterButtonText: {
    fontSize: responsiveFont(14),
    fontWeight: '600',
  },
  filterButtonTextActive: {
    // color: colors.textPrimary,
  },
  listContainer: {
    flex: 1,
    width: '100%',
  },
  listContent: {
    padding: responsivePadding(10),
    width: '100%',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: responsivePadding(15),
    borderRadius: 12,
    marginBottom: 8,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      }
    }),
  },
  currentUserItem: {
    borderWidth: 2,
  },
  rankContainer: {
    marginRight: 15,
    width: 40,
    alignItems: 'center',
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topRankBadge: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  rankText: {
    fontSize: responsiveFont(14),
    fontWeight: 'bold',
  },
  topRankText: {
    // color override
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userMain: {
    flex: 1,
  },
  userName: {
    fontSize: responsiveFont(16),
    fontWeight: '600',
    marginBottom: 4,
  },
  currentUserName: {
    fontWeight: 'bold',
  },
  userStatsText: {
    fontSize: responsiveFont(12),
  },
  scoreContainer: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  score: {
    fontSize: responsiveFont(18),
    fontWeight: 'bold',
    marginBottom: 2,
  },
  scoreLabel: {
    fontSize: responsiveFont(10),
  },
  topThreeDecoration: {
    position: 'absolute',
    top: -5,
    right: -5,
  },
  topThreeIcon: {
    fontSize: responsiveFont(20),
  },
  emptyState: {
    alignItems: 'center',
    padding: responsivePadding(40),
    width: '100%',
  },
  emptyEmoji: {
    fontSize: responsiveFont(48),
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: responsiveFont(20),
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: responsiveFont(14),
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  statsContainer: {
    margin: responsivePadding(20),
    padding: responsivePadding(20),
    borderRadius: 16,
    width: 'auto',
  },
  statsTitle: {
    fontSize: responsiveFont(18),
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  statsGrid: {
    // Flex direction dinamik olacak
    width: '100%',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: responsiveFont(20),
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: responsiveFont(12),
    textAlign: 'center',
  },
  motivation: {
    margin: responsivePadding(20),
    padding: responsivePadding(20),
    borderRadius: 12,
    alignItems: 'center',
  },
  motivationText: {
    fontSize: responsiveFont(14),
    textAlign: 'center',
    fontWeight: '500',
  },
  recentNumber: {
     fontSize: responsiveFont(16),
     fontWeight: 'bold',
     textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    fontSize: responsiveFont(16),
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    fontWeight: 'bold',
  }
});