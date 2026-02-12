import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Collapsible } from '@/components/ui/collapsible';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function BusStationRoutesScreen() {
  const { station, city, region } = useLocalSearchParams<{
    station?: string;
    city?: string;
    region?: string;
  }>();

  const routes = [
    { destination: 'Douala', time: '6:30 AM', price: '6,000 FCFA', details: 'Direct, 3h' },
    { destination: 'Bafoussam', time: '8:00 AM', price: '5,000 FCFA', details: 'One stop at Mbouda' },
    { destination: 'Bamenda', time: '9:15 AM', price: '6,500 FCFA', details: 'Express service' },
    { destination: 'Buea', time: '10:30 AM', price: '7,000 FCFA', details: 'Includes luggage' },
  ];

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity style={styles.headerBack} onPress={() => router.back()}>
        <IconSymbol name="chevron.right" size={20} color="#0A7CFF" style={{ transform: [{ rotate: '180deg' }] }} />
        <ThemedText type="defaultSemiBold" style={styles.backText}>Back</ThemedText>
      </TouchableOpacity>

      <ThemedText type="title">Available Routes</ThemedText>
      <ThemedText style={styles.fromText}>🚌 From: {station ?? 'Selected Station'}</ThemedText>
      {!!city && <ThemedText style={styles.locationText}>📍 {city}{region ? ` • ${region}` : ''}</ThemedText>}

      <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
        {routes.map((r, index) => (
          <ThemedView key={index} style={styles.card}>
            <ThemedText type="defaultSemiBold" style={styles.destination}>📍 {r.destination}</ThemedText>
            <ThemedText style={styles.meta}>🕒 {r.time} • 💰 {r.price}</ThemedText>

            <Collapsible title="Details">
              <ThemedText style={styles.detailsText}>{r.details}</ThemedText>
              <TouchableOpacity style={styles.selectButton} onPress={() => { /* TODO: booking flow */ }}>
                <ThemedText type="link">Select & Book</ThemedText>
              </TouchableOpacity>
            </Collapsible>
          </ThemedView>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 18 },

  headerBack: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  backText: { color: '#0A7CFF' },

  fromText: { marginTop: 6, color: '#666' },
  locationText: { color: '#777', marginBottom: 12 },

  list: { marginTop: 6 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  destination: { fontSize: 16, marginBottom: 6 },
  meta: { color: '#555', marginBottom: 8 },
  detailsText: { color: '#444' },
  selectButton: { marginTop: 10 },
});
