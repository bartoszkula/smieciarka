import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PickupDay, WASTE_TYPES } from '../data/schedule';
import { daysBetween, relativeLabel, weekdayDate } from '../utils/format';
import { WasteDot } from './WasteDot';
import { usePrefs } from '../prefs';
import { Theme } from '../theme';

export function NextPickupCard({ today, next }: { today: Date; next: PickupDay | null }) {
  const { palette, lang, t } = usePrefs();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  if (!next) {
    return (
      <View style={styles.card}>
        <Text style={styles.empty}>{t('next.none')}</Text>
      </View>
    );
  }

  const away = daysBetween(today, next.dateObj);
  const accent = WASTE_TYPES[next.types[0]].color;

  return (
    <View style={[styles.card, { borderLeftColor: accent }]}>
      <Text style={styles.kicker}>{t('next.kicker')} · {relativeLabel(away, t).toUpperCase()}</Text>
      <View style={styles.typesRow}>
        {next.types.map((ty) => (
          <View key={ty} style={styles.typeChip}>
            <WasteDot type={ty} size={13} />
            <Text style={styles.typeTxt}>{t(`waste.${ty}`)}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.date}>{weekdayDate(next.dateObj, lang)}</Text>
      <Text style={styles.note}>{t('next.note')}</Text>
    </View>
  );
}

const makeStyles = (c: Theme) => StyleSheet.create({
  card: {
    backgroundColor: c.card, borderRadius: 18, padding: 18,
    borderLeftWidth: 6, borderLeftColor: c.primary,
    shadowColor: c.shadow, shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: c.textMuted, marginBottom: 10 },
  typesRow: { gap: 8, marginBottom: 8 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  typeTxt: { fontSize: 19, fontWeight: '700', color: c.text },
  date: { fontSize: 15, color: c.textMuted, textTransform: 'capitalize', marginTop: 2 },
  note: { fontSize: 12.5, color: c.textFaint, marginTop: 8 },
  empty: { fontSize: 16, color: c.textMuted, textAlign: 'center' },
});
