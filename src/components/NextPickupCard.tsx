import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PickupDay, WASTE_TYPES } from '../data/schedule';
import { daysBetween, relativeLabel, weekdayDate } from '../utils/format';
import { WasteDot } from './WasteDot';
import { theme } from '../theme';

export function NextPickupCard({ today, next }: { today: Date; next: PickupDay | null }) {
  if (!next) {
    return (
      <View style={styles.card}>
        <Text style={styles.empty}>Brak zaplanowanych wywozów 🎉</Text>
      </View>
    );
  }

  const away = daysBetween(today, next.dateObj);
  const accent = WASTE_TYPES[next.types[0]].color;

  return (
    <View style={[styles.card, { borderLeftColor: accent }]}>
      <Text style={styles.kicker}>NAJBLIŻSZY WYWÓZ · {relativeLabel(away).toUpperCase()}</Text>
      <View style={styles.typesRow}>
        {next.types.map((t) => (
          <View key={t} style={styles.typeChip}>
            <WasteDot type={t} size={13} />
            <Text style={styles.typeTxt}>{WASTE_TYPES[t].label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.date}>{weekdayDate(next.dateObj)}</Text>
      <Text style={styles.note}>Wystaw pojemniki do 6:00 rano w dniu wywozu.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.card, borderRadius: 18, padding: 18,
    borderLeftWidth: 6, borderLeftColor: theme.primary,
    shadowColor: theme.shadow, shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: theme.textMuted, marginBottom: 10 },
  typesRow: { gap: 8, marginBottom: 8 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  typeTxt: { fontSize: 19, fontWeight: '700', color: theme.text },
  date: { fontSize: 15, color: theme.textMuted, textTransform: 'capitalize', marginTop: 2 },
  note: { fontSize: 12.5, color: theme.textFaint, marginTop: 8 },
  empty: { fontSize: 16, color: theme.textMuted, textAlign: 'center' },
});
