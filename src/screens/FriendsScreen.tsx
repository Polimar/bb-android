import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const FriendsScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>👥 Sistema Amicizie</Text>
      <Text style={styles.text}>
        Sistema completo di gestione amicizie implementato nel backend:
      </Text>
      <Text style={styles.text}>
        ✅ Invio richieste di amicizia{'\n'}
        ✅ Accettazione/Rifiuto richieste{'\n'}
        ✅ Lista amici{'\n'}
        ✅ Ricerca utenti{'\n'}
        ✅ Inviti a partite P2P
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  text: {
    fontSize: 16,
    marginBottom: 15,
    lineHeight: 24,
  },
});

export default FriendsScreen; 