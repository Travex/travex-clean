import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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

import { supabase } from '../lib/supabase';

/**
 * Helper — DISPLAY ONLY (no timer, no interval)
 */
function getSecondsLeft(expiresAt?: string) {
  if (!expiresAt) return 0;

  return Math.max(
    Math.floor(
      (new Date(expiresAt).getTime() - Date.now()) / 1000
    ),
    0
  );
}

export default function LoginScreen() {
  const router = useRouter();

  /**
   * IMPORTANT:
   * Use ONE naming everywhere → ticket_id
   */
  const { ticket_id, expires_at } = useLocalSearchParams<{
    ticket_id?: string;
    expires_at?: string;
  }>();

  /* 🚨 HARD BLOCK: NO TICKET, NO LOGIN */
  if (!ticket_id || !expires_at) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.info}>
            Invalid session. Please select seats again.
          </Text>

          <Pressable
            style={styles.continueBtn}
            onPress={() => router.replace('/seats')}
          >
            <Text style={styles.continueText}>
              Go back to seats
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const [phone, setPhone] = useState('');
  const [seats, setSeats] = useState('');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const isValid = phone.length >= 9;

  /**
   * FETCH TICKET DATA (NO TIMER HERE)
   */
  useEffect(() => {
    async function fetchTicket() {
      const { data, error } = await supabase
        .from('tickets')
        .select('seats')
        .eq('id', ticket_id)
        .single();

      if (error || !data) {
        router.replace('/seats');
        return;
      }

      setSeats(data.seats);
      setTotal(data.seats.split(',').length * 5000);
    }

    fetchTicket();
  }, [ticket_id, router]);

  /**
   * DISPLAY TIME LEFT (derived from expires_at)
   * NO setInterval
   */
  const secondsLeft = getSecondsLeft(expires_at);
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  /**
   * SEND OTP THEN NAVIGATE
   */
  async function handleContinue() {
    if (!isValid || loading) return;

    try {
      setLoading(true);

      await fetch(
  'https://gitfgmufdkdmmaicptpu.supabase.co/functions/v1/send-otp',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
    },
    body: JSON.stringify({
      phone,
      ticket_id,
    }),
  }
);

      router.replace({
        pathname: '/otp',
        params: {
          phone,
          ticket_id,
          expires_at,
        },
      });
    } catch (err) {
      Alert.alert(
        'OTP Error',
        'Failed to send OTP. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/seats')}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Login</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* CONTENT */}
      <View style={styles.container}>
        <Text style={styles.info}>Seats: {seats}</Text>
        <Text style={styles.info}>Total: {total} CFA</Text>

        <Text style={styles.timer}>
          Seat held for {minutes}:
          {seconds.toString().padStart(2, '0')}
        </Text>

        <Text style={styles.label}>Phone Number</Text>

        <TextInput
          style={styles.input}
          placeholder="+237 6XX XXX XXX"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        <Pressable
          style={[
            styles.continueBtn,
            (!isValid || loading) && styles.disabledBtn,
          ]}
          disabled={!isValid || loading}
          onPress={handleContinue}
        >
          <Text style={styles.continueText}>
            {loading ? 'Sending OTP…' : 'Continue'}
          </Text>
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  backText: {
    fontSize: 22,
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 25,
    fontWeight: '600',
  },

  container: {
    padding: 20,
  },

  info: {
    fontSize: 20,
    marginBottom: 6,
    fontWeight: '500',
  },

  timer: {
    marginTop: 16,
    marginBottom: 20,
    fontSize: 18,
    color: '#D97706',
    fontWeight: '600',
  },

  label: {
    fontSize: 20,
    marginBottom: 8,
  },

  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    fontSize: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
  },

  continueBtn: {
    backgroundColor: '#0A7CFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  disabledBtn: {
    backgroundColor: '#999',
  },

  continueText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
});
