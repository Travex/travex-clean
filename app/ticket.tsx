import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../src/config/api';

/**
 * TicketScreen (CamPay flow)
 *
 * This screen:
 * - does NOT verify Flutterwave
 * - does NOT require txRef
 * - reads the ticket from your backend using ticket_id
 * - shows QR only if ticket exists (and ideally paid=true)
 */
export default function TicketScreen() {
  const router = useRouter();

  const { ticket_id } = useLocalSearchParams<{
    ticket_id?: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<{
    id: string;
    seats?: string | null;
    paid?: boolean | null;
    qr_svg?: string | null;
  } | null>(null);

  useEffect(() => {
    if (!ticket_id) {
      Alert.alert('Invalid access', 'Missing ticket ID.');
      router.replace('/');
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/tickets/${ticket_id}`);
        const json = await res.json();

        if (!res.ok || !json?.ok || !json?.ticket) {
          throw new Error(json?.error || 'Ticket not found');
        }

        // Optional: if you want to hard-block unpaid tickets, uncomment:
        // if (!json.ticket.paid) {
        //   throw new Error('Payment not confirmed yet. Please wait a moment and try again.');
        // }

        setTicket(json.ticket);
      } catch (err: any) {
        Alert.alert('Ticket error', err?.message || 'Unable to load ticket');
        router.replace('/');
      } finally {
        setLoading(false);
      }
    })();
  }, [ticket_id, router]);

  const qrValue = useMemo(() => {
    if (!ticket?.id) return '';
    return JSON.stringify({ ticket_id: ticket.id });
  }, [ticket?.id]);

  const reference = useMemo(() => {
    if (!ticket?.id) return '';
    return `TRX-${ticket.id.slice(0, 8).toUpperCase()}`;
  }, [ticket?.id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading ticket…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!ticket) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>🎫 Your Ticket</Text>

        <Text style={styles.info}>Seats: {ticket.seats || '—'}</Text>
        <Text style={styles.info}>
          Status: {ticket.paid ? 'PAID ✅' : 'PENDING ⏳'}
        </Text>

        <View style={styles.qrWrapper}>
          <QRCode value={qrValue} size={200} />
          <Text style={styles.qrRef}>{reference}</Text>
        </View>

        <Pressable style={styles.doneBtn} onPress={() => router.replace('/')}>
          <Text style={styles.doneText}>Done</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f6f7f9',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#555',
  },
  container: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 18,
  },
  info: {
    fontSize: 16,
    marginBottom: 6,
    color: '#333',
  },
  qrWrapper: {
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 30,
  },
  qrRef: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  doneBtn: {
    backgroundColor: '#0A7CFF',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  doneText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
