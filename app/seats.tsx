import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { createTicket } from '../src/config/api';

export default function SeatsScreen() {
  const router = useRouter();
  const { routeId } = useLocalSearchParams<{ routeId?: string }>();

  const TOTAL_SEATS = 70;
  const SEATS_PER_ROW = 5;

  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [confirmedSeats, setConfirmedSeats] = useState<number[]>([]);
  const [pendingSeats, setPendingSeats] = useState<number[]>([]);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);

  const seats = Array.from({ length: TOTAL_SEATS }, (_, i) => i + 1);

  /* FETCH SEAT STATUS (CONFIRMED + PENDING NOT EXPIRED) */
  const fetchSeatStatus = useCallback(async () => {
    if (!routeId) return;

    const { data, error } = await supabase
      .from('tickets')
      .select('seats, status, expires_at')
      .eq('route_id', routeId)
      .in('status', ['confirmed', 'pending'])
      .gt('expires_at', new Date().toISOString());

    if (error || !data) return;

    const confirmed: number[] = [];
    const pending: number[] = [];

    data.forEach(ticket => {
      const seatNumbers = ticket.seats
        .split(',')
        .map((s: string) => Number(s.trim()));

      if (ticket.status === 'confirmed') {
        confirmed.push(...seatNumbers);
      } else {
        pending.push(...seatNumbers);
      }
    });

    setConfirmedSeats(confirmed);
    setPendingSeats(pending);
  }, [routeId]);

  /* INITIAL FETCH + AUTO REFRESH */
  useEffect(() => {
    fetchSeatStatus();

    const interval = setInterval(() => {
      fetchSeatStatus();
    }, 10000); // 🔁 every 10 seconds

    return () => clearInterval(interval);
  }, [fetchSeatStatus]);

  /* TOGGLE SEAT */
  function toggleSeat(seat: number) {
    if (confirmedSeats.includes(seat) || pendingSeats.includes(seat)) return;

    setSelectedSeats(current =>
      current.includes(seat)
        ? current.filter(s => s !== seat)
        : [...current, seat]
    );
  }

  /* CONTINUE → CREATE TICKET → LOGIN */
  async function handleContinue() {
    if (!routeId || selectedSeats.length === 0) {
      Alert.alert('Select seats', 'Please select at least one seat');
      return;
    }

    if (isCreatingTicket) return;
    setIsCreatingTicket(true);

    // Keep the same 5-minute reservation logic you already had
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    try {
      // Create ticket through backend (not directly from phone)
      const result = await createTicket(routeId, selectedSeats.join(','));

      if (!result?.ok || !result?.ticket) {
        setIsCreatingTicket(false);
        Alert.alert('Error', 'Could not create ticket');
        return;
      }

      const ticket = result.ticket;

      router.replace({
        pathname: '/login',
        params: {
          ticket_id: ticket.id,
          // If your backend returns expires_at later, keep using it.
          // For now, we pass our local expiresAt to keep the flow working.
          expires_at: ticket.expires_at || expiresAt,
        },
      });
    } catch (e) {
      setIsCreatingTicket(false);
      Alert.alert('Error', 'Network error creating ticket');
      return;
    } finally {
      setIsCreatingTicket(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Select Seats</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.legendTitle}>Front of bus</Text>

        {/* LEGEND */}
        <View style={styles.legendBox}>
          <LegendItem label="Available" style={styles.legendAvailable} />
          <LegendItem label="Selected" style={styles.legendSelected} />
          <LegendItem label="Booked" style={styles.legendPending} />
          <LegendItem label="Sold" style={styles.legendConfirmed} />
        </View>

        {/* SEATS GRID */}
        {Array.from({
          length: Math.ceil(TOTAL_SEATS / SEATS_PER_ROW),
        }).map((_, rowIndex) => {
          const rowSeats = seats.slice(
            rowIndex * SEATS_PER_ROW,
            rowIndex * SEATS_PER_ROW + SEATS_PER_ROW
          );

          return (
            <View key={rowIndex} style={styles.row}>
              <View style={styles.leftSide}>
                {rowSeats.slice(0, 3).map(seat => (
                  <Seat
                    key={seat}
                    seat={seat}
                    selected={selectedSeats.includes(seat)}
                    confirmed={confirmedSeats.includes(seat)}
                    pending={pendingSeats.includes(seat)}
                    onPress={() => toggleSeat(seat)}
                  />
                ))}
              </View>

              <View style={styles.aisle} />

              <View style={styles.rightSide}>
                {rowSeats.slice(3).map(seat => (
                  <Seat
                    key={seat}
                    seat={seat}
                    selected={selectedSeats.includes(seat)}
                    confirmed={confirmedSeats.includes(seat)}
                    pending={pendingSeats.includes(seat)}
                    onPress={() => toggleSeat(seat)}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>
        <Text style={styles.summary}>
          Selected seats: {selectedSeats.join(', ') || 'None'}
        </Text>

        <Pressable
          style={[
            styles.continueBtn,
            (selectedSeats.length === 0 || isCreatingTicket) &&
              styles.disabledBtn,
          ]}
          disabled={selectedSeats.length === 0 || isCreatingTicket}
          onPress={handleContinue}
        >
          <Text style={styles.continueText}>
            {isCreatingTicket
              ? 'Processing...'
              : `Continue (${selectedSeats.length})`}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

/* ---------- SMALL COMPONENTS ---------- */

function LegendItem({ label, style }: { label: string; style: any }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSeat, style]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function Seat({
  seat,
  selected,
  confirmed,
  pending,
  onPress,
}: {
  seat: number;
  selected: boolean;
  confirmed: boolean;
  pending: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={confirmed || pending}
      style={[
        styles.seat,
        selected && styles.seatSelected,
        confirmed && styles.seatConfirmed,
        pending && styles.seatPending,
      ]}
      onPress={onPress}
    >
      <Text style={styles.seatText}>{pending ? 'Booked' : seat}</Text>
    </Pressable>
  );
}

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f7f9' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  backText: { fontSize: 22 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
  },

  container: { padding: 20 },

  legendTitle: {
    textAlign: 'center',
    marginBottom: 8,
    color: '#555',
  },

  legendBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    marginBottom: 8,
  },

  legendSeat: {
    width: 18,
    height: 18,
    borderRadius: 4,
    marginRight: 8,
    borderWidth: 1,
  },

  legendText: { fontSize: 14 },

  legendAvailable: { backgroundColor: '#fff', borderColor: '#ddd' },
  legendSelected: { backgroundColor: '#0A7CFF', borderColor: '#0A7CFF' },
  legendPending: { backgroundColor: '#FDE68A', borderColor: '#F59E0B' },
  legendConfirmed: { backgroundColor: '#E5E7EB', borderColor: '#9CA3AF' },

  row: { flexDirection: 'row', marginBottom: 12 },
  leftSide: { flexDirection: 'row', gap: 8, flex: 3 },
  rightSide: {
    flexDirection: 'row',
    gap: 8,
    flex: 2,
    justifyContent: 'flex-end',
  },
  aisle: { flex: 1 },

  seat: {
    width: 50,
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },

  seatSelected: { backgroundColor: '#0A7CFF', borderColor: '#0A7CFF' },
  seatPending: { backgroundColor: '#FDE68A', borderColor: '#F59E0B' },
  seatConfirmed: { backgroundColor: '#E5E7EB', borderColor: '#9CA3AF' },

  seatText: { fontSize: 14, fontWeight: '600' },

  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },

  summary: { fontSize: 16, marginBottom: 10 },
  continueBtn: {
    backgroundColor: '#0A7CFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  continueText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  disabledBtn: { backgroundColor: '#999' },
});
