import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const FALLBACK_LOCK_SECONDS = 5 * 60; // 5 minutes

function secondsLeftFromExpiresAt(expiresAt?: string) {
  if (!expiresAt) return FALLBACK_LOCK_SECONDS;

  const expiresMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresMs)) return FALLBACK_LOCK_SECONDS;

  const diff = Math.floor((expiresMs - Date.now()) / 1000);
  return Math.max(diff, 0);
}

export default function OtpScreen() {
  const router = useRouter();

  const { phone, seats, total, expires_at, ticket_id } = useLocalSearchParams<{
    phone?: string;
    seats?: string;
    total?: string;
    expires_at?: string;
    ticket_id?: string;
  }>();

  const initialSecondsLeft = useMemo(
    () => secondsLeftFromExpiresAt(expires_at),
    [expires_at]
  );

  const [otp, setOtp] = useState('');
  const [timeLeft, setTimeLeft] = useState(initialSecondsLeft);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiredRef = useRef(false);

  // Seat lock countdown
  useEffect(() => {
    if (initialSecondsLeft <= 0) {
      Alert.alert(
        'Session expired',
        'Seat reservation expired. Please select seats again.'
      );
      router.replace('/seats');
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);

          if (!expiredRef.current) {
            expiredRef.current = true;
            Alert.alert(
              'Session expired',
              'Seat reservation expired. Please select seats again.'
            );
            router.replace('/seats');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [initialSecondsLeft, router]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  function handleOtpChange(text: string) {
    const clean = text.replace(/\D/g, '').slice(0, 4);
    setOtp(clean);
    setError('');
  }

  async function handleVerify() {
    if (loading) return;

    if (!phone || !ticket_id) {
      Alert.alert('Error', 'Missing phone or ticket ID. Please try again.');
      router.replace('/seats');
      return;
    }

    if (timeLeft <= 0) {
      Alert.alert('Session expired', 'Please select seats again.');
      router.replace('/seats');
      return;
    }

    if (otp.length !== 4) {
      setError('Enter the 4-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(
        'https://gitfgmufdkdmmaicptpu.supabase.co/functions/v1/verify-otp',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!}`,
          },
          body: JSON.stringify({ phone, otp }),
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError('Invalid or expired OTP');
        return;
      }

      // ✅ OTP verified → proceed to payment screen
      router.replace({
        pathname: '../payment',
        params: {
          seats,
          total,
          expires_at,
          ticket_id,
          phone,
        },
      });
    } catch (err) {
      setError('OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} disabled={loading}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Verify OTP</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* CONTENT */}
      <View style={styles.container}>
        <Text style={styles.info}>Code sent to {phone || 'your phone'}</Text>

        <Text style={styles.timer}>
          Seat held for {minutes}:{seconds.toString().padStart(2, '0')}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Enter 4-digit code"
          keyboardType="number-pad"
          maxLength={4}
          value={otp}
          onChangeText={handleOtpChange}
          editable={!loading}
          textContentType="oneTimeCode"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[
            styles.continueBtn,
            (otp.length !== 4 || loading) && styles.disabledBtn,
          ]}
          disabled={otp.length !== 4 || loading}
          onPress={handleVerify}
        >
          {loading ? <ActivityIndicator /> : <Text style={styles.continueText}>Verify</Text>}
        </Pressable>
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

  info: { fontSize: 20, marginBottom: 8 },

  timer: {
    fontSize: 18,
    color: '#C0392B',
    marginBottom: 12,
  },

  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
  },

  error: {
    color: 'red',
    marginBottom: 10,
    fontSize: 18,
  },

  continueBtn: {
    backgroundColor: '#0A7CFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  disabledBtn: { backgroundColor: '#999' },

  continueText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
});
