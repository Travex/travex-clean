import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL } from '../src/config/api';

type Step = 'method' | 'details';
type Method = 'mtn' | 'orange';

export default function PaymentScreen() {
  const router = useRouter();

  const { ticket_id } = useLocalSearchParams<{ ticket_id?: string }>();

  const [step, setStep] = useState<Step>('method');
  const [method, setMethod] = useState<Method | null>(null);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const [seatList, setSeatList] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // HARD BLOCK
  useEffect(() => {
    if (!ticket_id) {
      Alert.alert('Invalid session', 'Please start seat selection again.');
      router.replace('/seats');
    }
  }, [ticket_id, router]);

  // FETCH TICKET INFO FROM BACKEND (READ ONLY)
  useEffect(() => {
    async function fetchTicket() {
      if (!ticket_id) return;

      try {
        const res = await fetch(`${API_BASE_URL}/tickets/${ticket_id}`);
        const json = await res.json();

        if (!res.ok || !json.ok || !json.ticket) {
          Alert.alert('Session error', 'Could not load ticket details.');
          router.replace('/seats');
          return;
        }

        const seats = json.ticket.seats || '';
        setSeatList(seats);

        // Keep your pricing logic here for now (5000 per seat)
        const count = seats ? seats.split(',').filter(Boolean).length : 0;
        setTotalAmount(Math.min(25, count * 10));

      } catch (e) {
        Alert.alert('Network error', 'Could not reach backend.');
        router.replace('/seats');
      }
    }

    fetchTicket();
  }, [ticket_id, router]);

  function handleContinue() {
    if (!method) return;
    setStep('details');
  }

  function handleBack() {
    if (loading) return;

    if (step === 'details') {
      setStep('method');
    } else {
      router.back();
    }
  }

  // Poll backend until ticket becomes paid (webhook updates it)
  function startPollingPaid(ticketId: string) {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/tickets/${ticketId}`);
        const json = await res.json();

        if (res.ok && json?.ok && json?.ticket?.paid) {
          if (pollRef.current) clearInterval(pollRef.current);

          // Go to ticket screen (we’ll build it next)
          router.replace({
            pathname: '/ticket',
            params: { ticket_id: ticketId },
          });
        }
      } catch {
        // ignore polling errors
      }
    }, 3000);
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  /**
   * CAM PAY (via backend)
   * This calls: POST /campay/collect  (we’ll add this endpoint next)
   */
  async function handlePay() {
    if (loading) return;

    if (!ticket_id) {
      Alert.alert('Error', 'Missing ticket ID');
      return;
    }

    if (!method) {
      Alert.alert('Choose method', 'Select MTN or Orange');
      return;
    }

    if (phone.length < 9) {
      Alert.alert('Invalid number', 'Enter a valid mobile number');
      return;
    }

    setLoading(true);

    const testRes = await fetch(`${API_BASE_URL}/health`);
const testJson = await testRes.json();
Alert.alert('Health test', JSON.stringify(testJson));
return;

    try {
      const res = await fetch(`${API_BASE_URL}/campay/collect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_id,
          phone_number: phone,
          operator: method === 'mtn' ? 'MTN' : 'ORANGE',
          amount: totalAmount,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        Alert.alert('Payment error', json.error || 'Could not start payment');
        setLoading(false);
        return;
      }

      Alert.alert(
        'Payment started',
        'Please complete the payment on your phone. We will confirm automatically.'
      );

      // Start polling until webhook marks paid=true
      startPollingPaid(ticket_id);
    } catch (e) {
      Alert.alert('Payment error', 'Network error starting payment');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} disabled={loading}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Payment</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* CONTENT */}
      <View style={styles.container}>
        <Text style={styles.info}>Seats: {seatList || '—'}</Text>
        <Text style={styles.info}>Total: {totalAmount} XAF</Text>
        <Text style={styles.info}>Ticket ID: {ticket_id}</Text>

        {step === 'method' && (
          <>
            <Text style={styles.label}>Choose a payment method</Text>

            <Pressable
              style={[styles.method, method === 'mtn' && styles.methodSelected]}
              onPress={() => setMethod('mtn')}
              disabled={loading}
            >
              <Text style={styles.methodText}>MTN Mobile Money</Text>
            </Pressable>

            <Pressable
              style={[
                styles.method,
                method === 'orange' && styles.methodSelected,
              ]}
              onPress={() => setMethod('orange')}
              disabled={loading}
            >
              <Text style={styles.methodText}>Orange Money</Text>
            </Pressable>

            <Pressable
              style={[styles.continueBtn, !method && styles.disabledBtn]}
              disabled={!method || loading}
              onPress={handleContinue}
            >
              <Text style={styles.continueText}>Continue</Text>
            </Pressable>
          </>
        )}

        {step === 'details' && (
          <>
            <Text style={styles.label}>Enter Mobile Money number</Text>

            <TextInput
              style={styles.input}
              placeholder="+237 6XX XXX XXX"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              editable={!loading}
            />

            <Pressable
              style={[styles.payBtn, phone.length < 9 && styles.disabledBtn]}
              disabled={phone.length < 9 || loading}
              onPress={handlePay}
            >
              <Text style={styles.payText}>
                {loading ? 'Starting…' : 'Confirm & Pay'}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f7f9' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  backText: { fontSize: 22 },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },

  container: { padding: 20 },

  info: { fontSize: 18, marginBottom: 6 },

  label: {
    marginTop: 20,
    marginBottom: 10,
    fontSize: 18,
    fontWeight: '600',
  },

  method: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
  },

  methodSelected: {
    borderColor: '#0A7CFF',
    backgroundColor: '#EAF2FF',
  },

  methodText: { fontSize: 18 },

  continueBtn: {
    backgroundColor: '#0A7CFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },

  continueText: { color: '#fff', fontSize: 18, fontWeight: '600' },

  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
  },

  payBtn: {
    backgroundColor: '#0A7CFF',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },

  payText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  disabledBtn: { backgroundColor: '#999' },
});
