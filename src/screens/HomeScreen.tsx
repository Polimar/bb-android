import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

const HomeScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🧠 BrainBrawler</Text>
        <Text style={styles.subtitle}>Mobile P2P Quiz Platform</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎮 Architettura P2P Implementata</Text>
          <Text style={styles.cardText}>
            Ogni dispositivo mobile ha TUTTE le funzionalità server + client.
            Sistema di elezione automatica del server con emergency mode per utenti FREE.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔄 Server Election Algorithm</Text>
          <Text style={styles.cardText}>
            Algoritmo deterministico per elezione host basato su:
            1. Account Premium/Admin priority
            2. Stabilità connessione
            3. Livello batteria
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🚨 Emergency Mode</Text>
          <Text style={styles.cardText}>
            Quando non ci sono host Premium disponibili, gli utenti FREE 
            possono temporaneamente diventare server per mantenere il gioco attivo.
          </Text>
        </View>

        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Crea Partita P2P</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.secondaryButton]}>
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>
            Trova Partita Disponibile
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#667eea',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#667eea',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: '#667eea',
  },
});

export default HomeScreen; 