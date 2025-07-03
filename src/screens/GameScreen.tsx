import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { P2PGameEngine } from '../services/P2PGameEngine';
import { User, Game, Question, GameResults, AccountType } from '../types';

interface GameScreenProps {
  user: User;
  gameEngine: P2PGameEngine;
}

const GameScreen: React.FC<GameScreenProps> = ({ user, gameEngine }) => {
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [gameId, setGameId] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [gameResults, setGameResults] = useState<GameResults | null>(null);

  useEffect(() => {
    // Set up game engine event listeners
    gameEngine.onGameStateChange(handleGameStateChange);
    gameEngine.onQuestionReceived(handleQuestionReceived);
    gameEngine.onGameComplete(handleGameComplete);

    return () => {
      // Cleanup listeners if needed
    };
  }, [gameEngine]);

  const handleGameStateChange = (game: Game) => {
    setCurrentGame(game);
  };

  const handleQuestionReceived = (question: Question, timeLimit: number) => {
    setCurrentQuestion(question);
    setTimeLeft(timeLimit);
    setSelectedOption(null);
    
    // Start countdown
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1000) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
  };

  const handleGameComplete = (results: GameResults) => {
    setGameResults(results);
    setShowResults(true);
    setCurrentQuestion(null);
  };

  const createNewGame = async () => {
    if (!gameEngine.canHost()) {
      Alert.alert('Premium Required', 'You need a Premium account to host games. In emergency mode, you can still participate!');
      return;
    }

    setLoading(true);
    try {
      const game = await gameEngine.createGame({
        name: `${user.username}'s Game`,
        questionSetId: 'default-set', // You would let user choose
        maxPlayers: 8,
        timePerQuestion: 15,
        isPrivate: false,
      });
      
      Alert.alert('Success', `Game created! Game ID: ${game.id}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  const joinExistingGame = async () => {
    if (!gameId.trim()) {
      Alert.alert('Error', 'Please enter a game ID');
      return;
    }

    setLoading(true);
    try {
      const game = await gameEngine.joinGame(gameId.trim());
      Alert.alert('Success', `Joined game: ${game.name}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join game');
    } finally {
      setLoading(false);
    }
  };

  const startGame = async () => {
    try {
      await gameEngine.startGame();
      Alert.alert('Game Started', 'The quiz has begun!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start game');
    }
  };

  const submitAnswer = () => {
    if (selectedOption === null || !currentQuestion) {
      Alert.alert('Error', 'Please select an answer');
      return;
    }

    gameEngine.submitAnswer(currentQuestion.id, selectedOption);
    setSelectedOption(null);
  };

  const renderGameLobby = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Game Lobby</Text>
      <Text style={styles.gameInfo}>Game: {currentGame?.name}</Text>
      <Text style={styles.gameInfo}>Players: {currentGame?.players.length}/{currentGame?.maxPlayers}</Text>
      
      <ScrollView style={styles.playersList}>
        {currentGame?.players.map((player) => (
          <View key={player.id} style={styles.playerItem}>
            <Text style={styles.playerName}>
              {player.username} {player.isHost ? '👑' : ''}
            </Text>
            <Text style={styles.playerInfo}>
              {player.accountType} • {player.isReady ? '✅' : '⏳'}
            </Text>
          </View>
        ))}
      </ScrollView>

      {gameEngine.isCurrentHost() && (
        <TouchableOpacity
          style={[styles.button, currentGame?.players.length < 2 && styles.buttonDisabled]}
          onPress={startGame}
          disabled={currentGame?.players.length < 2}
        >
          <Text style={styles.buttonText}>Start Game</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderQuestion = () => (
    <View style={styles.section}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionNumber}>
          Question {(currentGame?.questionIndex || 0) + 1}
        </Text>
        <Text style={styles.timer}>
          ⏰ {Math.ceil(timeLeft / 1000)}s
        </Text>
      </View>
      
      <Text style={styles.questionText}>{currentQuestion?.text}</Text>
      
      <View style={styles.optionsContainer}>
        {currentQuestion?.options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.optionButton,
              selectedOption === index && styles.optionSelected,
            ]}
            onPress={() => setSelectedOption(index)}
          >
            <Text style={[
              styles.optionText,
              selectedOption === index && styles.optionTextSelected,
            ]}>
              {String.fromCharCode(65 + index)}. {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, selectedOption === null && styles.buttonDisabled]}
        onPress={submitAnswer}
        disabled={selectedOption === null}
      >
        <Text style={styles.buttonText}>Submit Answer</Text>
      </TouchableOpacity>
    </View>
  );

  const renderResults = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>🏆 Game Results</Text>
      
      <ScrollView style={styles.resultsList}>
        {gameResults?.finalScores.map((result, index) => (
          <View key={result.userId} style={styles.resultItem}>
            <Text style={styles.resultPosition}>#{result.position}</Text>
            <View style={styles.resultInfo}>
              <Text style={styles.resultName}>{result.username}</Text>
              <Text style={styles.resultScore}>
                {result.score} points • {result.correctAnswers} correct
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          setShowResults(false);
          setCurrentGame(null);
          setGameResults(null);
        }}
      >
        <Text style={styles.buttonText}>Back to Menu</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMainMenu = () => (
    <>
      <View style={styles.accountInfo}>
        <Text style={styles.accountType}>
          Account: {user.accountType}
          {user.accountType === AccountType.FREE && ' (Emergency hosting available)'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Create New Game</Text>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={createNewGame}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>
              {gameEngine.canHost() ? 'Create Game' : 'Emergency Create Game'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Join Existing Game</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter Game ID"
          value={gameId}
          onChangeText={setGameId}
          editable={!loading}
        />
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={joinExistingGame}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Join Game</Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🎮 P2P Quiz Game</Text>
        <Text style={styles.subtitle}>Real-time multiplayer with emergency failover</Text>
      </View>

      {showResults ? renderResults() : 
       currentQuestion ? renderQuestion() :
       currentGame ? renderGameLobby() :
       renderMainMenu()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#667eea',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  accountInfo: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    margin: 20,
    borderRadius: 8,
  },
  accountType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1565c0',
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#667eea',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  gameInfo: {
    fontSize: 16,
    marginBottom: 10,
    color: '#666',
  },
  playersList: {
    maxHeight: 200,
    marginBottom: 20,
  },
  playerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  playerInfo: {
    fontSize: 14,
    color: '#666',
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  questionNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#667eea',
  },
  timer: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  questionText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    lineHeight: 24,
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  optionSelected: {
    borderColor: '#667eea',
    backgroundColor: '#e3f2fd',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  optionTextSelected: {
    color: '#667eea',
    fontWeight: 'bold',
  },
  resultsList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultPosition: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#667eea',
    marginRight: 15,
    minWidth: 40,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  resultScore: {
    fontSize: 14,
    color: '#666',
  },
});

export default GameScreen; 