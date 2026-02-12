import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';

type Route = {
  id: string;
  from_city: string;
  to_city: string;
  price: number;
  departure_time: string;
};

export default function RouteDetailsScreen() {
  const { routeId } = useLocalSearchParams<{ routeId: string }>();
  const router = useRouter();

  const [route, setRoute] = useState<Route | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRoute() {
      if (!routeId) return;

      setIsLoading(true);

      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('id', routeId)
        .single();

      if (error) {
        console.log('Error fetching route:', error.message);
      } else {
        setRoute(data);
      }

      setIsLoading(false);
    }

    fetchRoute();
  }, [routeId]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* HEADER */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Route Details</Text>

        <View style={styles.rightSpacer} />
      </View>

      {/* CONTENT */}
      <View style={styles.container}>
        {isLoading ? (
          <Text>Loading route...</Text>
        ) : !route ? (
          <Text>Route not found</Text>
        ) : (
          <>
            <Text style={styles.routeTitle}>
              {route.from_city} → {route.to_city}
            </Text>

            <Text style={styles.detail}>
              Departure time: {route.departure_time}
            </Text>

            <Text style={styles.price}>
              {route.price} XAF
            </Text>

            <TouchableOpacity
              style={styles.continueBtn}
              onPress={() =>
                router.push({
                  pathname: '/seats',
                  params: { routeId },
                })
              }
            >
              <Text style={styles.continueText}>
                Continue to seat selection 
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
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
  container: {
    padding: 20,
  },
  routeTitle: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 16,
  },
  detail: {
    fontSize: 18,
    marginBottom: 12,
    color: '#555',
  },
  price: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0A7CFF',
  },
  continueBtn: {
    marginTop: 30,
    backgroundColor: '#0A7CFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  continueText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
