// @ts-nocheck
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Simple global store (temporary)
export let selectedRegion = 'Select your region';

export default function Index() {
  const [region, setRegion] = useState('Select your region');
  const [showRegionModal, setShowRegionModal] = useState(false);

  const regions = [
    'Adamawa',
    'Centre',
    'East',
    'Far North',
    'Littoral',
    'North',
    'North West',
    'South',
    'South West',
    'West',
  ];

const goToAgencies = () => {
  if (region === 'Select your region') return;

  router.replace({
    pathname: '/agencies',
    params: {
      region,
    },
  });
};

  return (
    <ImageBackground
      source={require('../assets/images/background.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.container}>

          <Text style={[styles.title, styles.noSpacing]}>Welcome to</Text>
          <Text style={styles.title}>TRAVEX</Text>

          <Text style={styles.subtitle}>
            Travel smart across Cameroon
          </Text>

          <Pressable
            style={styles.regionBox}
            onPress={() => setShowRegionModal(true)}
          >
            <Text style={styles.regionText}>📍 {region}</Text>
          </Pressable>

          <TouchableOpacity
            style={styles.mainButton}
            onPress={goToAgencies}
          >
            <Text style={styles.mainButtonText}>🚍 Bus Stations</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.disabledButton}>
            <Text style={styles.disabledText}>✈️ Flight Tickets</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.disabledButton}>
            <Text style={styles.disabledText}>🚆 Train Tickets</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.disabledButton}>
            <Text style={styles.disabledText}>🚢 Ship Tickets</Text>
          </TouchableOpacity>

        </View>
      </View>

      <Modal visible={showRegionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select your region</Text>

            <ScrollView>
              {regions.map((item) => (
                <Pressable
                  key={item}
                  style={styles.regionItem}
                  onPress={() => {
                    setRegion(item);
                    setShowRegionModal(false);
                  }}
                >
                  <Text style={styles.regionItemText}>{item}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              style={styles.closeButton}
              onPress={() => setShowRegionModal(false)}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },

  // 👇 ONLY CHANGE IS HERE
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    transform: [{ translateY: -20 }],
},

  title: {
    fontSize: 60,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#fff',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  noSpacing: { marginBottom: 0 },
  subtitle: {
  textAlign: 'center',
  color: '#eee',
  marginBottom: 28,
  fontSize: 20, // 👈 clear, readable, accessible
},


  regionBox: {
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 10,
    marginBottom: 20,
  },
  regionText: { textAlign: 'center', fontSize: 25, color: '#333' },

  mainButton: {
    backgroundColor: '#0A7CFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
  },
  mainButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 28,

      // 👇 thin black outline effect
  textShadowColor: 'rgba(0,0,0,0.6)',
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 20,
  },

  disabledButton: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  disabledText: { textAlign: 'center', color: '#555', fontSize: 20 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: '70%',
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  regionItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  regionItemText: { fontSize: 16, textAlign: 'center' },
  closeButton: { marginTop: 12, padding: 12 },
  closeButtonText: {
    textAlign: 'center',
    color: '#0A7CFF',
    fontWeight: 'bold',
  },
});
