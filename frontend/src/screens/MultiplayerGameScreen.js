// frontend/src/screens/MultiplayerGameScreen.js
import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../utils/colors';

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
  
  const timerRef = useRef(null);
  const pollRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(1)).current;

  const fetchGame = useCallback(async () => {
    if (!gameId) return;
    
    try {
      const response = await api.get(`/api/multiplayer/game/${gameId}`);
      if (response.data.success) {
        setGame(response.data.game);
        
        // Oyun başladıysa timer başlat
        if (response.data.game.status === 'in_progress' && !answerSubmitted) {
          startTimer();
        }
      } else {
        Alert.alert('Hata', response.data.error || 'Oyun yüklenemedi');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Oyun yüklenemedi:', error);
      Alert.alert('Hata', 'Oyun yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [gameId, answerSubmitted]);

  const setPlayerReady = async () => {
    try {
      const response = await api.post(`/api/multiplayer/ready/${gameId}`);
      if (response.data.success) {
        if (response.data.game_started) {
          Alert.alert('🎮', 'Oyun başlıyor!');
        }
        fetchGame();
      }
    } catch (error) {
      console.error('Ready hatası:', error);
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
    if (!answerSubmitted) {
      submitAnswer(null); // Süre doldu, boş cevap
    }
  };

  const submitAnswer = async (answer) => {
    if (answerSubmitted) return;
    
    setSelectedAnswer(answer);
    setAnswerSubmitted(true);
    clearInterval(timerRef.current);
    
    const timeTaken = questionStartTime ? (Date.now() - questionStartTime) / 1000 : 30;
    
    try {
      const response = await api.post(`/api/multiplayer/answer/${gameId}`, {
        question_index: currentQuestion,
        answer: answer,
        time_taken: timeTaken
      });
      
      if (response.data.success) {
        // Kısa bir bekleme sonrası sonraki soruya geç
        setTimeout(() => {
          if (currentQuestion < (game?.questions?.length || 0) - 1) {
            setCurrentQuestion(prev => prev + 1);
            setSelectedAnswer(null);
            setAnswerSubmitted(false);
            startTimer();
          } else {
            // Oyun bitti
            fetchGame();
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Cevap gönderme hatası:', error);
    }
  };

  // Polling - rakibin durumunu kontrol et
  useEffect(() => {
    if (game?.status === 'waiting') {
      pollRef.current = setInterval(fetchGame, 3000);
    } else if (pollRef.current) {
      clearInterval(pollRef.current);
    }
    
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [game?.status, fetchGame]);

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
    return (
      <SafeAreaView style={[globalStyles.safeArea, styles.container]}>
        <GradientView colors={[colors.primary, colors.secondary]} style={styles.waitingContainer}>
          <Text style={styles.waitingTitle}>🎮 Multiplayer Oyun</Text>
          <Text style={styles.opponentText}>Rakip: {game.opponent_username}</Text>
          
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
          
          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>İptal</Text>
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
        <View style={styles.scoreHeader}>
          <Text style={styles.playerScore}>Sen: {game.my_score}</Text>
          <Text style={styles.vsText}>VS</Text>
          <Text style={styles.opponentScore}>{game.opponent_username}: {game.opponent_score}</Text>
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
              ]}
              onPress={() => !answerSubmitted && submitAnswer(option)}
              disabled={answerSubmitted}
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
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  playerScore: {
    color: colors.success,
    fontSize: 16,
    fontWeight: 'bold',
  },
  vsText: {
    color: colors.textMuted,
    fontSize: 14,
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
  optionText: {
    color: colors.textPrimary,
    fontSize: 16,
  },
  optionTextSelected: {
    fontWeight: 'bold',
  },
};

export default MultiplayerGameScreen;
