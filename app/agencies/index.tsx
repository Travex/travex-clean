import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';

type Agency = {
  id: string;
  name: string;
  location: string;
  region: string;
};

export default function AgenciesScreen() {
  const { region } = useLocalSearchParams();

  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAgencies() {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .eq('region', region);
        console.log('RAW data from Supabase:', data);
console.log('Number of agencies:', data?.length);

      if (error) {
        console.log('Error fetching agencies:', error.message);
      } else {
        console.log('Agencies from Supabase:', data);
        setAgencies(data ?? []);
      }

      setIsLoading(false);
    }

    fetchAgencies();
  }, [region]);

const visibleAgencies = agencies;

const displayRegion = region ?? 'Selected region';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* HEADER */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.replace('/')} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </Pressable>

        <Text style={styles.title}>Bus Stations</Text>
        <View style={styles.rightSpacer} />
      </View>

      {/* CONTENT */}
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* REGION CONTEXT */}
        <View style={styles.regionRow}>
          <Text style={styles.regionText}>📍 {displayRegion}</Text>
          <Pressable onPress={() => router.replace('/')}>
            <Text style={styles.changeRegion}>Change</Text>
          </Pressable>
        </View>

        {/* LOADING STATE */}
        {isLoading && (
          <>
            {[1, 2, 3].map(i => (
              <View key={i} style={styles.skeletonCard} />
            ))}
          </>
        )}

        {/* EMPTY STATE */}
        {!isLoading && visibleAgencies.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No bus agencies found</Text>
            <Text style={styles.emptyText}>
              Try selecting another region
            </Text>
          </View>
        )}

        {/* AGENCIES */}
        {!isLoading &&
          visibleAgencies.map((agency) => (
            <Pressable
              key={agency.id}
              onPress={() =>
                router.push({
                  pathname: '/routes',
                  params: {
                    agencyId: agency.id,
                    agencyName: agency.name,
                    agencyLocation: agency.location,
                  },
                })
              }
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
            >
              <Text style={styles.agencyName}>{agency.name}</Text>
              <Text style={styles.agencyLocation}>
                {agency.location}
              </Text>

              <Text style={styles.cardCta}>View routes →</Text>
            </Pressable>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },

  /* HEADER */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: { width: 40 },
  backText: { fontSize: 22 },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 30,
    fontWeight: '700',
  },
  rightSpacer: { width: 40 },

  /* CONTENT */
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },

  regionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  regionText: {
    fontSize: 20,
    color: '#444',
    fontWeight: '500',
  },
  changeRegion: {
    fontSize: 14,
    color: '#0A7CFF',
    fontWeight: '500',
  },

  /* CARD */
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardPressed: {
    backgroundColor: '#f2f4f7',
  },
  agencyName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 6,
  },
  agencyLocation: {
    fontSize: 14,
    color: '#666',
  },
  cardCta: {
    marginTop: 12,
    fontSize: 14,
    color: '#0A7CFF',
    fontWeight: '500',
    alignSelf: 'flex-end',
  },

  /* SKELETON */
  skeletonCard: {
    height: 90,
    backgroundColor: '#eee',
    borderRadius: 14,
    marginBottom: 14,
  },

  /* EMPTY */
  emptyState: {
    marginTop: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
  },
});
console.log(
  'SUPABASE URL:',
  process.env.EXPO_PUBLIC_SUPABASE_URL
);
