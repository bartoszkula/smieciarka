import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SectionList } from 'react-native';
import { upcomingFrom, WASTE_TYPES, PickupDay, ScheduleData } from '../data/schedule';
import { daysBetween, relativeLabel, MONTHS_PL, MONTHS_PL_GEN } from '../utils/format';
import { WasteDot } from './WasteDot';
import { NextPickupCard } from './NextPickupCard';
import { theme } from '../theme';

interface Section {
  title: string;
  data: PickupDay[];
}

export function ListView({ schedule, today }: { schedule: ScheduleData; today: Date }) {
  const upcoming = useMemo(() => upcomingFrom(schedule, today), [schedule, today]);
  const next = upcoming[0] ?? null;

  const sections = useMemo<Section[]>(() => {
    const map = new Map<string, PickupDay[]>();
    for (const d of upcoming) {
      const key = `${d.dateObj.getFullYear()}-${d.dateObj.getMonth()}`;
      const arr = map.get(key) ?? [];
      arr.push(d);
      map.set(key, arr);
    }
    return Array.from(map.entries()).map(([key, data]) => {
      const [, m] = key.split('-').map(Number);
      const name = MONTHS_PL[m];
      return { title: `${name.charAt(0).toUpperCase()}${name.slice(1)}`, data };
    });
  }, [upcoming]);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.date}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <View style={styles.headerWrap}>
          <NextPickupCard today={today} next={next} />
          <Text style={styles.listLabel}>Kolejne wywozy</Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>Brak nadchodzących wywozów w {today.getFullYear()}.</Text>
      }
      renderSectionHeader={({ section }) => (
        <Text style={styles.sectionHeader}>{section.title}</Text>
      )}
      renderItem={({ item }) => {
        const away = daysBetween(today, item.dateObj);
        return (
          <View style={styles.row}>
            <View style={styles.dateCol}>
              <Text style={styles.dayNum}>{item.dateObj.getDate()}</Text>
              <Text style={styles.monthShort}>{MONTHS_PL_GEN[item.dateObj.getMonth()].slice(0, 3)}</Text>
            </View>
            <View style={styles.typesCol}>
              {item.types.map((t) => (
                <View key={t} style={styles.typeRow}>
                  <WasteDot type={t} size={11} />
                  <Text style={styles.typeTxt}>{WASTE_TYPES[t].label}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.away, away <= 1 && styles.awaySoon]}>{relativeLabel(away)}</Text>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 14, paddingBottom: 28 },
  headerWrap: { marginBottom: 8 },
  listLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5, color: theme.textMuted, marginTop: 20, marginBottom: 4 },
  sectionHeader: { fontSize: 14, fontWeight: '700', color: theme.text, marginTop: 14, marginBottom: 6, paddingHorizontal: 2 },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card,
    borderRadius: 14, padding: 12, marginBottom: 8, gap: 12,
    shadowColor: theme.shadow, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  dateCol: { width: 46, alignItems: 'center' },
  dayNum: { fontSize: 22, fontWeight: '800', color: theme.text, lineHeight: 24 },
  monthShort: { fontSize: 11, color: theme.textMuted, textTransform: 'lowercase' },
  typesCol: { flex: 1, gap: 4 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeTxt: { fontSize: 14.5, color: theme.text },
  away: { fontSize: 12.5, color: theme.textMuted, fontWeight: '600' },
  awaySoon: { color: theme.primary, fontWeight: '800' },
  empty: { textAlign: 'center', color: theme.textMuted, marginTop: 30 },
});
