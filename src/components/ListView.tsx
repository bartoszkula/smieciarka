import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SectionList } from 'react-native';
import { upcomingFrom, WASTE_TYPES, PickupDay, ScheduleData } from '../data/schedule';
import { daysBetween, relativeLabel, monthLong, monthShort } from '../utils/format';
import { WasteDot } from './WasteDot';
import { NextPickupCard } from './NextPickupCard';
import { usePrefs } from '../prefs';
import { Theme } from '../theme';

interface Section {
  title: string;
  data: PickupDay[];
}

export function ListView({ schedule, today }: { schedule: ScheduleData; today: Date }) {
  const { palette, lang, t } = usePrefs();
  const styles = useMemo(() => makeStyles(palette), [palette]);
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
      return { title: monthLong(m, lang), data };
    });
  }, [upcoming, lang]);

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
          <Text style={styles.listLabel}>{t('list.upcoming')}</Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>{t('list.empty', { year: today.getFullYear() })}</Text>
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
              <Text style={styles.monthShort}>{monthShort(item.dateObj.getMonth(), lang)}</Text>
            </View>
            <View style={styles.typesCol}>
              {item.types.map((ty) => (
                <View key={ty} style={styles.typeRow}>
                  <WasteDot type={ty} size={11} />
                  <Text style={styles.typeTxt}>{t(`waste.${ty}`)}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.away, away <= 1 && styles.awaySoon]}>{relativeLabel(away, t)}</Text>
          </View>
        );
      }}
    />
  );
}

const makeStyles = (c: Theme) => StyleSheet.create({
  scroll: { padding: 14, paddingBottom: 28 },
  headerWrap: { marginBottom: 8 },
  listLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 0.5, color: c.textMuted, marginTop: 20, marginBottom: 4 },
  sectionHeader: { fontSize: 14, fontWeight: '700', color: c.text, marginTop: 14, marginBottom: 6, paddingHorizontal: 2 },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: c.card,
    borderRadius: 14, padding: 12, marginBottom: 8, gap: 12,
    shadowColor: c.shadow, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  dateCol: { width: 46, alignItems: 'center' },
  dayNum: { fontSize: 22, fontWeight: '800', color: c.text, lineHeight: 24 },
  monthShort: { fontSize: 11, color: c.textMuted, textTransform: 'lowercase' },
  typesCol: { flex: 1, gap: 4 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeTxt: { fontSize: 14.5, color: c.text },
  away: { fontSize: 12.5, color: c.textMuted, fontWeight: '600' },
  awaySoon: { color: c.primary, fontWeight: '800' },
  empty: { textAlign: 'center', color: c.textMuted, marginTop: 30 },
});
