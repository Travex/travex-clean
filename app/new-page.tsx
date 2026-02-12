import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

/**
 * Scaffold page for a new screen.
 * - Rename this file to `app/<your-page>.tsx` to add a new route.
 * - Use `ThemedView` / `ThemedText` for theme-aware styles.
 */
export default function NewPage() {
  const items = ['Example item 1', 'Example item 2', 'Example item 3'];

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        New Page
      </ThemedText>

      <ThemedText type="subtitle" style={styles.subtitle}>
        A scaffold template — replace with your UI.
      </ThemedText>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
        {items.map((it, i) => (
          <TouchableOpacity
            key={i}
            style={styles.card}
            onPress={() => router.push('/bus-stations')}
          >
            <ThemedText type="defaultSemiBold">{it}</ThemedText>
            <ThemedText style={styles.cardMeta}>Tap to open routes</ThemedText>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { marginBottom: 8 },
  subtitle: { marginBottom: 12 },
  list: { marginTop: 8 },
  card: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
  },
  cardMeta: { marginTop: 6, color: '#666' },
});