import { useLocalSearchParams, useRouter, } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

export default function BusStationRoutesScreen() {
  const { agencyId, agencyName, agencyLocation } = useLocalSearchParams();
  const router = useRouter();
  const [routes, setRoutes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  async function fetchRoutes() {
    if (!agencyId) return;

    setIsLoading(true);

    const { data, error } = await supabase
      .from('routes')
      .select('*')
      .eq('agency_id', agencyId);

    if (error) {
      console.log('Error fetching routes:', error.message);
    } else {
      setRoutes(data ?? []);
    }

    setIsLoading(false);
  }

  fetchRoutes();
}, [agencyId]);


  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* TOP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Available routes</Text>

        <View style={styles.rightSpacer} />
      </View>

      {/* AGENCY CONTEXT */}
      <View style={styles.agencyBlock}>
        <Text style={styles.agencyName}>
          🏢 {agencyName ?? 'Agency'}
        </Text>
        <Text style={styles.agencyLocation}>
          📍 {agencyLocation ?? 'Location'}
        </Text>
      </View>

      {/* ROUTES */}
      <ScrollView contentContainerStyle={styles.container}>
      {isLoading ? (
      <Text>Loading routes...</Text>
      ) : routes.length === 0 ? (
  <Text>No routes available</Text>
) : (
  routes.map((route: any) => (
    <Pressable
      key={route.id}
      style={styles.card}
onPress={() =>
  router.push({
    pathname: '/seats',
    params: {
      routeId: route.id,
    },
  })
}
    >
      <Text style={styles.route}>
        {route.from_city} → {route.to_city}
      </Text>

      <Text style={styles.price}>
        {route.price} XAF
      </Text>

      <Text style={styles.time}>
        Departure: {route.departure_time}
      </Text>
      <Text style={styles.cardCta}>
  Proceed to seat selection →
</Text>
    </Pressable>
  ))
)}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f6f7f9',
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    width: 40,
  },
  backText: {
    fontSize: 22,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  rightSpacer: {
    width: 40,
  },

  agencyBlock: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  agencyName: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 4,
  },
  agencyLocation: {
    fontSize: 17,
    color: '#666',
  },

  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  route: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 6,
  },
  price: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0A7CFF',
    marginBottom: 4,
  },
time: {
  fontSize: 18,
  color: '#555',
},

cardCta: {
  marginTop: 12,
  fontSize: 14,
  color: '#0A7CFF',
  fontWeight: '500',
  alignSelf: 'flex-end',
},
});
