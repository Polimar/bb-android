import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import 'react-native-get-random-values';

import LoginScreen from './src/screens/LoginScreen';
import ApiService from './src/services/api';
import { P2PGameEngine } from './src/services/P2PGameEngine';
import { User } from './src/types';

// Temporary GameScreen component
const GameScreen = ({ user, gameEngine }: { user: User; gameEngine: P2PGameEngine }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎮 BrainBrawler Game</Text>
      <Text style={styles.subtitle}>Welcome, {user.email}!</Text>
      <Text style={styles.subtitle}>Account: {user.accountType}</Text>
      <Text style={styles.info}>P2P Game Engine Ready ✅</Text>
      <Text style={styles.info}>Ready for multiplayer quiz battles!</Text>
    </View>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [gameEngine, setGameEngine] = useState<P2PGameEngine | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      if (ApiService.isAuthenticated()) {
        const currentUser = await ApiService.getCurrentUser();
        setUser(currentUser);
        
        // Initialize P2P Game Engine
        const engine = new P2PGameEngine(currentUser);
        setGameEngine(engine);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear any invalid tokens
      await ApiService.logout();
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    
    // Initialize P2P Game Engine
    const engine = new P2PGameEngine(loggedInUser);
    setGameEngine(engine);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading BrainBrawler...</Text>
      </View>
    );
  }

  // Simple conditional rendering without complex navigation
  if (user && gameEngine) {
    return <GameScreen user={user} gameEngine={gameEngine} />;
  }

  return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#667eea',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    color: 'white',
    marginBottom: 10,
  },
  info: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 5,
  },
});

export default App;
