// frontend/src/screens/MultiplayerGameScreen.js
import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import socketService from '../services/SocketService';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../utils/colors';
import GameNotification from '../components/GameNotification';
import ConfirmDialog from '../components/ConfirmDialog';

const GradientView = ({ colors: gradientColors, style, children }) => {
  if (Platform.OS === 'web') {
    return (
      <View style={[style, { backgroundImage: `linear-gradient(135deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 100%)` }]}>
        {children}
      </View>
    );
  }
  const { LinearGradient } = require('expo-linear-gradient');
  return (
    <LinearGradient colors={gradientColors} style={style}>
      {children}
    </LinearGradient>
  );
};

const MultiplayerGameScreen = ({ route, navigation }) => {
  const { gameId } = route.params || {};
  const { user } = useContext(AuthContext);
  
  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [countdown, setCountdown] = useState(null); // 3-2-1 countdown
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [notification, setNotification] = useState(null);
  
  const timerRef = useRef(null);
  const pollRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(1)).current;

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchGame = useCallback(async () => {
    if (!gameId) return;
    
    try {
      const response = await api.get(`/api/multiplayer/game/${gameId}`);
      if (response.data.success) {
        const gameData = response.data.game;
        setGame(gameData);
        
        // Oyun tamamlandıysa
        if (gameData.status === 'completed') {
          clearInterval(timerRef.current);
          clearInterval(pollRef.current);
          return;
        }
        
        // Her iki oyuncu da hazır oldu ve countdown başlamadıysa
        if (gameData.status === 'waiting' && gameData.my_ready && gameData.opponent_ready && countdown === null) {
          startCountdown();
        }
        
        // Oyun başladıysa ve cevap verilmediyse timer başlat
        // ⚠️ Timer zaten çalışıyorsa tekrar başlatma (diğer oyuncu cevap verince resetlemesin)
        if (gameData.status === 'in_progress' && !answerSubmitted && countdown === null && timerRef.current === null) {
          startTimer();
        }
      } else {
        showNotification(response.data.error || 'Oyun yüklenemedi', 'error');
        setTimeout(() => navigation.goBack(), 2000);
      }
    } catch (error) {
      console.error('Oyun yüklenemedi:', error);
      showNotification('Oyun yüklenemedi', 'error');
    } finally {
      setLoading(false);
    }
  }, [gameId, answerSubmitted, countdown]);

  const startCountdown = () => {
    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setTimeout(() => {
            setCountdown(null);
            fetchGame(); // Oyun durumunu güncelle
          }, 1000);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const setPlayerReady = async () => {
    try {
      const response = await api.post(`/api/multiplayer/ready/${gameId}`);
      if (response.data.success) {
        if (response.data.game_started) {
          showNotification('🎮 Oyun başlıyor!', 'success');
        }
        fetchGame();
      }
    } catch (error) {
      console.error('Ready hatası:', error);
      showNotification('Hazır işaretlenemedi', 'error');
    }
  };

  const cancelGame = async () => {
    setShowCancelDialog(false);
    try {
      const response = await api.post(`/api/multiplayer/cancel/${gameId}`);
      if (response.data.success) {
        showNotification('Oyun iptal edildi', 'info');
        setTimeout(() => navigation.goBack(), 1500);
      } else {
        showNotification(response.data.error || 'Oyun iptal edilemedi', 'error');
      }
    } catch (error) {
      console.error('Oyun iptal hatası:', error);
      showNotification('Oyun iptal edilemedi', 'error');
    }
  };

  const startTimer = () => {
    setTimeLeft(30);
    setQuestionStartTime(Date.now());
    
    // Progress animation
    progressAnim.setValue(1);
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 30000,
      useNativeDriver: false,
    }).start();
    
    // Countdown timer
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeUp = () => {
    console.log('⏰ Süre doldu! answerSubmitted:', answerSubmitted);
    if (!answerSubmitted) {
      console.log('📤 Boş cevap gönderiliyor...');
      submitAnswer(null); // Süre doldu, boş cevap gönder
    }
  };

  const submitAnswer = async (answer) => {
    if (answerSubmitted) {
      console.log('⚠️ Zaten cevap gönderilmiş, işlem atlanıyor');
      return;
    }
    if (!game || !game.questions || currentQuestion >= game.questions.length) {
      console.error('❌ Geçersiz soru indexi:', currentQuestion, 'Toplam:', game?.questions?.length);
      return;
    }
    
    console.log('📝 Cevap gönderiliyor:', answer, 'Soru:', currentQuestion);
    setSelectedAnswer(answer);
    setAnswerSubmitted(true);
    
    // Timer'ı temizle ve null yap
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    const timeTaken = questionStartTime ? (Date.now() - questionStartTime) / 1000 : 30;
    
    try {
      const response = await api.post(`/api/multiplayer/answer/${gameId}`, {
        question_index: currentQuestion,
        answer: answer,
        time_taken: timeTaken
      });
      
      if (response.data.success) {
        const totalQuestions = game.questions.length;
        const isLastQuestion = currentQuestion >= totalQuestions - 1;
        
        // Kısa bir bekleme sonrası sonraki soruya geç veya oyunu güncelle
        setTimeout(() => {
          if (!isLastQuestion) {
            console.log('➡️ Sonraki soruya geçiliyor...', currentQuestion + 1);
            setCurrentQuestion(prev => prev + 1);
            setSelectedAnswer(null);
            setAnswerSubmitted(false);
            // Timer'ı temizle ve yeniden başlat
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            startTimer();
          } else {
            // Son soruydu, oyun durumunu güncelle
            console.log('🏁 Son soru tamamlandı!');
            showNotification('Oyun tamamlandı! Sonuçlar yükleniyor...', 'success');
            fetchGame();
          }
        }, 1500);
      } else {
        console.error('❌ Backend hatası:', response.data.error);
        showNotification(response.data.error || 'Cevap gönderilemedi', 'error');
        setSelectedAnswer(null);
        setAnswerSubmitted(false);
        // Timer'ı yeniden başlat (hata durumu)
        startTimer();
      }
    } catch (error) {
      console.error('❌ Cevap gönderme hatası:', error);
      showNotification('Cevap gönderilemedi', 'error');
      // Hata durumunda state'i resetle ve timer'ı yeniden başlat
      setSelectedAnswer(null);
      setAnswerSubmitted(false);
      startTimer();
    }
  };

  // Polling - rakibin durumunu kontrol et (5 saniyede bir)
  useEffect(() => {
    if (game?.status === 'waiting') {
      pollRef.current = setInterval(fetchGame, 5000); // 30s -> 5s
    } else if (pollRef.current) {
      clearInterval(pollRef.current);
    }
    
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [game?.status, fetchGame]);

  // WebSocket bağlantısı ve event dinleyicileri
  useEffect(() => {
    let socketConnected = false;

    const setupSocket = async () => {
      console.log('🔌 MultiplayerGameScreen: WebSocket bağlanıyor...');
      const socket = await socketService.connect();
      if (!socket) {
        console.warn('⚠️ Socket bağlantısı kurulamadı, polling kullanılıyor');
        return;
      }

      socketConnected = true;
      console.log('✅ MultiplayerGameScreen: Socket bağlı, listener\'lar ekleniyor');

      // Oyun odasına katıl
      socketService.joinGameRoom(gameId);
      console.log(`🎮 Oyun odasına katılındı: ${gameId}`);

      // Oyuncu hazır olduğunda
      socketService.on('game_ready', (data) => {
        console.log('🎮 [MultiplayerGame] Oyuncu hazır oldu:', data);
        if (data.game_id === gameId) {
          fetchGame(); // Oyun durumunu güncelle
        }
      });

      // ✅ Oyun başladığında (her iki oyuncu da hazır)
      socketService.on('game_started', (data) => {
        console.log('🚀 [MultiplayerGame] Oyun başladı:', data);
        if (data.game_id === gameId) {
          showNotification('🎮 Her iki oyuncu da hazır! Oyun başlıyor...', 'success');
          // WebSocket'ten countdown değeri geliyorsa kullan
          if (data.countdown) {
            setCountdown(data.countdown);
            const countdownInterval = setInterval(() => {
              setCountdown(prev => {
                if (prev <= 1) {
                  clearInterval(countdownInterval);
                  setTimeout(() => {
                    setCountdown(null);
                    fetchGame(); // Oyun durumunu güncelle
                  }, 1000);
                  return 'BAŞLA!';
                }
                return prev - 1;
              });
            }, 1000);
          } else {
            startCountdown();
          }
        }
      });

      // Oyun güncellemesi
      socketService.on('game_update', (data) => {
        console.log('🔄 [MultiplayerGame] Oyun güncellendi:', data);
        if (data.game_id === gameId) {
          fetchGame();
        }
      });

      // ✅ Oyun iptal edildi - hem game room hem user room'dan dinle
      socketService.on('game_cancelled', (data) => {
        console.log('❌ [MultiplayerGame] Oyun iptal edildi:', data);
        if (data.game_id === gameId) {
          const cancellerName = data.cancelled_by_username || 'Rakip';
          showNotification(data.message || `${cancellerName} oyunu iptal etti`, 'warning');
          setTimeout(() => navigation.goBack(), 2500);
        }
      });

      // Oyun daveti (yeni oyun için)
      socketService.on('game_invite', (data) => {
        console.log('📨 [MultiplayerGame] Oyun daveti geldi:', data);
        // Eğer bu ekrandayken yeni davet gelirse bildirimi göster
      });
    };

    setupSocket();

    return () => {
      console.log('🧹 MultiplayerGameScreen: WebSocket listener\'ları temizleniyor');
      if (socketConnected) {
        socketService.off('game_ready');
        socketService.off('game_started');
        socketService.off('game_update');
        socketService.off('game_cancelled');
        socketService.off('game_invite');
      }
    };
  }, [gameId, navigation]);

  useEffect(() => {
    fetchGame();
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={[globalStyles.safeArea, styles.container]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Oyun yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  if (!game) {
    return (
      <SafeAreaView style={[globalStyles.safeArea, styles.container]}>
        <Text style={styles.errorText}>Oyun bulunamadı</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Bekleme ekranı
  if (game.status === 'waiting') {
    // Countdown gösterimi
    if (countdown !== null) {
      return (
        <SafeAreaView style={[globalStyles.safeArea, styles.container]}>
          <GradientView colors={[colors.primary, colors.secondary]} style={styles.countdownContainer}>
            <Text style={styles.countdownTitle}>🎮 Oyun Başlıyor!</Text>
            <Text style={styles.countdownNumber}>
              {typeof countdown === 'number' ? countdown : countdown}
            </Text>
            <Text style={styles.countdownHint}>Hazır ol!</Text>
          </GradientView>
        </SafeAreaView>
      );
    }
    
    return (
      <SafeAreaView style={[globalStyles.safeArea, styles.container]}>
        <GradientView colors={[colors.primary, colors.secondary]} style={styles.waitingContainer}>
          {/* Navigasyon */}
          <View style={styles.navigationHeader}>
            <TouchableOpacity style={styles.navButton} onPress={() => navigation.goBack()}>
              <Text style={styles.navButtonText}>⬅️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navButton} onPress={() => navigation.navigate('Game')}>
              <Text style={styles.navButtonText}>🏠</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.waitingTitle}>🎮 Multiplayer Oyun</Text>
          <Text style={styles.opponentText}>Rakip: {game.opponent_username}</Text>
          <Text style={styles.questionCountInfo}>Soru Sayısı: {game.questions?.length || 10}</Text>
          
          <View style={styles.readyStatus}>
            <View style={styles.readyItem}>
              <Text style={styles.readyLabel}>Sen</Text>
              <Text style={[styles.readyIcon, game.my_ready && styles.readyActive]}>
                {game.my_ready ? '✓' : '⏳'}
              </Text>
            </View>
            <View style={styles.readyItem}>
              <Text style={styles.readyLabel}>{game.opponent_username}</Text>
              <Text style={[styles.readyIcon, game.opponent_ready && styles.readyActive]}>
                {game.opponent_ready ? '✓' : '⏳'}
              </Text>
            </View>
          </View>
          
          {!game.my_ready ? (
            <TouchableOpacity style={styles.readyButton} onPress={setPlayerReady}>
              <Text style={styles.readyButtonText}>✓ HAZIRIM</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.waitingMessage}>Rakip bekleniyor...</Text>
          )}
          
          <TouchableOpacity style={styles.cancelButton} onPress={() => setShowCancelDialog(true)}>
            <Text style={styles.cancelButtonText}>İptal</Text>
          </TouchableOpacity>
        </GradientView>
        
        {/* Cancel Dialog */}
        <ConfirmDialog
          visible={showCancelDialog}
          title="🚫 Oyunu İptal Et"
          message="Bu oyunu iptal etmek istediğinize emin misiniz?"
          onConfirm={cancelGame}
          onCancel={() => setShowCancelDialog(false)}
          confirmText="İptal Et"
          cancelText="Vazgeç"
        />
      </SafeAreaView>
    );
  }

  // Oyun iptal edildi ekranı
  if (game.status === 'cancelled') {
    return (
      <SafeAreaView style={[globalStyles.safeArea, styles.container]}>
        <GradientView colors={[colors.warning, '#f39c12']} style={styles.resultContainer}>
          <Text style={styles.resultEmoji}>🚫</Text>
          <Text style={styles.resultTitle}>Oyun İptal Edildi</Text>
          <Text style={styles.waitingMessage}>Bu oyun iptal edildi.</Text>
          
          <TouchableOpacity style={styles.homeButton} onPress={() => navigation.navigate('Game')}>
            <Text style={styles.homeButtonText}>Ana Menü</Text>
          </TouchableOpacity>
        </GradientView>
      </SafeAreaView>
    );
  }

  // Oyun tamamlandı ekranı
  if (game.status === 'completed') {
    const isWinner = game.winner === 'me';
    const isDraw = game.winner === 'draw';
    
    return (
      <SafeAreaView style={[globalStyles.safeArea, styles.container]}>
        <GradientView 
          colors={isWinner ? [colors.success, '#27ae60'] : isDraw ? [colors.warning, '#f39c12'] : [colors.danger, '#c0392b']} 
          style={styles.resultContainer}
        >
          <Text style={styles.resultEmoji}>
            {isWinner ? '🏆' : isDraw ? '🤝' : '😔'}
          </Text>
          <Text style={styles.resultTitle}>
            {isWinner ? 'Kazandın!' : isDraw ? 'Berabere!' : 'Kaybettin'}
          </Text>
          
          <View style={styles.scoreBoard}>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>Sen</Text>
              <Text style={styles.scoreValue}>{game.my_score}</Text>
            </View>
            <Text style={styles.scoreDivider}>-</Text>
            <View style={styles.scoreItem}>
              <Text style={styles.scoreLabel}>{game.opponent_username}</Text>
              <Text style={styles.scoreValue}>{game.opponent_score}</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.homeButton} onPress={() => navigation.navigate('Game')}>
            <Text style={styles.homeButtonText}>Ana Menü</Text>
          </TouchableOpacity>
        </GradientView>
      </SafeAreaView>
    );
  }

  // Oyun devam ediyor
  const question = game.questions?.[currentQuestion];
  
  return (
    <SafeAreaView style={[globalStyles.safeArea, styles.container]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.navButtons}>
            <TouchableOpacity style={styles.smallNavButton} onPress={() => navigation.goBack()}>
              <Text style={styles.smallNavButtonText}>⬅️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallNavButton} onPress={() => navigation.navigate('Game')}>
              <Text style={styles.smallNavButtonText}>🏠</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.scoreHeader}>
            <Text style={styles.playerScore}>Sen: {game.my_score}</Text>
            <Text style={styles.vsText}>VS</Text>
            <Text style={styles.opponentScore}>{game.opponent_username}: {game.opponent_score}</Text>
          </View>
          <TouchableOpacity style={styles.exitButton} onPress={cancelGame}>
            <Text style={styles.exitButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.progressContainer}>
          <Text style={styles.questionCount}>Soru {currentQuestion + 1}/{game.questions?.length}</Text>
          <Animated.View 
            style={[
              styles.progressBar, 
              { 
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%']
                }),
                backgroundColor: timeLeft > 10 ? colors.success : colors.danger
              }
            ]} 
          />
        </View>
        
        <Text style={[styles.timer, timeLeft <= 10 && styles.timerDanger]}>
          ⏱️ {timeLeft}s
        </Text>
      </View>

      {/* Soru */}
      <View style={styles.questionContainer}>
        <Text style={styles.wordText}>{question?.word}</Text>
        <Text style={styles.questionHint}>Bu kelimenin anlamı nedir?</Text>
      </View>

      {/* Şıklar */}
      <View style={styles.optionsContainer}>
        {question?.options?.map((option, index) => {
          const isSelected = selectedAnswer === option;
          const isCorrect = answerSubmitted && option === question?.my_answer && question?.my_correct;
          const isWrong = answerSubmitted && isSelected && !question?.my_correct;
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionButton,
                isSelected && styles.optionSelected,
                isCorrect && styles.optionCorrect,
                isWrong && styles.optionWrong,
                (answerSubmitted || timeLeft === 0) && styles.optionDisabled,
              ]}
              onPress={() => !answerSubmitted && timeLeft > 0 && submitAnswer(option)}
              disabled={answerSubmitted || timeLeft === 0}
            >
              <Text style={[
                styles.optionText,
                (isSelected || isCorrect || isWrong) && styles.optionTextSelected
              ]}>
                {String.fromCharCode(65 + index)}) {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* Game Notification */}
      {notification && (
        <GameNotification
          message={notification.message}
          type={notification.type}
          onHide={() => setNotification(null)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = {
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.textPrimary,
    marginTop: 20,
    fontSize: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 18,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 20,
    padding: 15,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Countdown Screen
  countdownContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  countdownNumber: {
    color: '#fff',
    fontSize: 120,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 10,
  },
  countdownHint: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 18,
    fontWeight: '500',
    marginTop: 30,
  },
  
  // Navigation
  navigationHeader: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 20,
  },
  navButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  smallNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallNavButtonText: {
    fontSize: 16,
  },
  
  // Waiting Screen
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  waitingTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  opponentText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 18,
    marginBottom: 10,
  },
  questionCountInfo: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 30,
  },
  readyStatus: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 30,
  },
  readyItem: {
    alignItems: 'center',
  },
  readyLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 10,
  },
  readyIcon: {
    fontSize: 40,
    color: 'rgba(255,255,255,0.5)',
  },
  readyActive: {
    color: '#2ecc71',
  },
  readyButton: {
    backgroundColor: '#2ecc71',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 20,
  },
  readyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  waitingMessage: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    marginBottom: 20,
  },
  cancelButton: {
    padding: 15,
  },
  cancelButtonText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  
  // Result Screen
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  resultEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  resultTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  scoreBoard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
  },
  scoreItem: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  scoreLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 5,
  },
  scoreValue: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  scoreDivider: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  homeButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Game Screen
  header: {
    padding: 15,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  exitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitButtonText: {
    color: colors.danger,
    fontSize: 20,
    fontWeight: 'bold',
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  playerScore: {
    color: colors.success,
    fontSize: 16,
    fontWeight: 'bold',
  },
  vsText: {
    color: colors.textMuted,
    fontSize: 14,
    marginHorizontal: 10,
  },
  opponentScore: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressContainer: {
    marginBottom: 10,
  },
  questionCount: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 5,
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
  timer: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  timerDanger: {
    color: colors.danger,
  },
  
  // Question
  questionContainer: {
    padding: 30,
    alignItems: 'center',
  },
  wordText: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  questionHint: {
    color: colors.textMuted,
    fontSize: 14,
  },
  
  // Options
  optionsContainer: {
    padding: 20,
  },
  optionButton: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '20',
  },
  optionCorrect: {
    borderColor: colors.success,
    backgroundColor: colors.success + '30',
  },
  optionWrong: {
    borderColor: colors.danger,
    backgroundColor: colors.danger + '30',
  },
  optionDisabled: {
    opacity: 0.5,
    backgroundColor: colors.disabled || '#95a5a6',
  },
  optionText: {
    color: colors.textPrimary,
    fontSize: 16,
  },
  optionTextSelected: {
    fontWeight: 'bold',
  },
};

export default MultiplayerGameScreen;
