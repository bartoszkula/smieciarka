import React, { useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, PanResponder, Animated, ScrollView,
} from 'react-native';
import {
  ScheduleData, WASTE_TYPES, WasteTypeId, toISO,
} from '../data/schedule';
import { mondayIndex, monthTitle, weekdayDate, weekdaysShort } from '../utils/format';
import { WasteDot } from './WasteDot';
import { Legend } from './Legend';
import { usePrefs } from '../prefs';
import { Theme } from '../theme';

interface Cell {
  day: number;
  iso: string;
  inMonth: boolean;
  isToday: boolean;
  types: WasteTypeId[];
}

function buildGrid(year: number, month0: number, byDate: Map<string, WasteTypeId[]>, todayISO: string): Cell[] {
  const first = new Date(year, month0, 1);
  const lead = mondayIndex(first.getDay());
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const cells: Cell[] = [];
  const prevDays = new Date(year, month0, 0).getDate();
  for (let i = lead - 1; i >= 0; i--) {
    cells.push({ day: prevDays - i, iso: '', inMonth: false, isToday: false, types: [] });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = toISO(year, month0, d);
    cells.push({ day: d, iso, inMonth: true, isToday: iso === todayISO, types: byDate.get(iso) ?? [] });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: 0, iso: '', inMonth: false, isToday: false, types: [] });
  }
  return cells;
}

function DayCell({
  cell, weekend, selected, onPress, styles,
}: {
  cell: Cell; weekend: boolean; selected: boolean; onPress: () => void; styles: ReturnType<typeof makeStyles>;
}) {
  const hasPickup = cell.types.length > 0;
  const square = (
    <View
      style={[
        styles.square,
        cell.isToday && styles.todayBorder,
        selected && !cell.isToday && styles.selRing,
      ]}
    >
      {hasPickup && (
        <View style={styles.stripes}>
          {cell.types.map((t) => (
            <View key={t} style={{ flex: 1, backgroundColor: WASTE_TYPES[t].color }} />
          ))}
        </View>
      )}
      <Text
        style={[
          styles.dayNum,
          !cell.inMonth && styles.dayOut,
          weekend && cell.inMonth && !hasPickup && styles.dayWeekend,
          hasPickup && styles.dayPickup,
        ]}
      >
        {cell.inMonth ? cell.day : ''}
      </Text>
    </View>
  );
  return (
    <Pressable style={styles.cell} disabled={!cell.inMonth} onPress={onPress}>
      {cell.isToday ? <View style={styles.todayHalo}>{square}</View> : square}
    </Pressable>
  );
}

export function CalendarView({ schedule, today }: { schedule: ScheduleData; today: Date }) {
  const { palette, lang, t } = usePrefs();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const weekdaysShortNames = useMemo(() => weekdaysShort(lang), [lang]);

  const { year, byDate } = schedule;
  const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate());
  const initialMonth = today.getFullYear() === year ? today.getMonth() : 0;
  const [month, setMonth] = useState(initialMonth);
  const [selected, setSelected] = useState<string | null>(
    today.getFullYear() === year ? todayISO : null,
  );

  const slide = useRef(new Animated.Value(0)).current;

  // Stabilna funkcja — używa funkcyjnej aktualizacji stanu, więc PanResponder
  // (tworzony raz) nigdy nie odczytuje przestarzałego `month`.
  const go = useCallback((dir: -1 | 1) => {
    setMonth((prev) => {
      const next = prev + dir;
      if (next < 0 || next > 11) return prev;
      setSelected(null);
      Animated.sequence([
        Animated.timing(slide, { toValue: dir * -20, duration: 90, useNativeDriver: true }),
        Animated.timing(slide, { toValue: 0, duration: 130, useNativeDriver: true }),
      ]).start();
      return next;
    });
  }, [slide]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 16 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
      onPanResponderRelease: (_e, g) => {
        if (g.dx <= -40) go(1);
        else if (g.dx >= 40) go(-1);
      },
    }),
  ).current;

  const grid = useMemo(() => buildGrid(year, month, byDate, todayISO), [year, month, byDate, todayISO]);
  const rows = useMemo(() => {
    const r: Cell[][] = [];
    for (let i = 0; i < grid.length; i += 7) r.push(grid.slice(i, i + 7));
    return r;
  }, [grid]);

  const selectedTypes = selected ? byDate.get(selected) ?? [] : [];
  const selectedDate = useMemo(() => {
    if (!selected) return null;
    const [y, m, d] = selected.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [selected]);

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Pressable
          onPress={() => go(-1)} disabled={month === 0}
          style={({ pressed }) => [styles.arrow, month === 0 && styles.arrowOff, pressed && styles.pressed]}
          hitSlop={10}
        >
          <Text style={styles.arrowTxt}>‹</Text>
        </Pressable>
        <Text style={styles.title}>{monthTitle(month, year, lang)}</Text>
        <Pressable
          onPress={() => go(1)} disabled={month === 11}
          style={({ pressed }) => [styles.arrow, month === 11 && styles.arrowOff, pressed && styles.pressed]}
          hitSlop={10}
        >
          <Text style={styles.arrowTxt}>›</Text>
        </Pressable>
      </View>

      <Animated.View style={[styles.card, { transform: [{ translateX: slide }] }]} {...pan.panHandlers}>
        <View style={styles.weekRow}>
          {weekdaysShortNames.map((w, i) => (
            <Text key={i} style={[styles.weekday, i >= 5 && styles.weekendHead]}>{w}</Text>
          ))}
        </View>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((c, ci) => (
              <DayCell
                key={ci}
                cell={c}
                weekend={ci >= 5}
                selected={c.inMonth && c.iso === selected}
                onPress={() => setSelected(c.iso)}
                styles={styles}
              />
            ))}
          </View>
        ))}
      </Animated.View>

      <Text style={styles.hint}>{t('cal.hint')}</Text>

      {/* Stała wysokość slotu — żeby wybór dnia nie zmieniał układu (kalendarz nie skacze). */}
      <View style={styles.detailSlot}>
        {selected && (
          <View style={styles.detail}>
            {selectedTypes.length > 0 ? (
              <>
                <Text style={styles.detailDate}>{selectedDate ? weekdayDate(selectedDate, lang) : ''}</Text>
                {selectedTypes.map((ty) => (
                  <View key={ty} style={styles.detailRow}>
                    <WasteDot type={ty} size={12} />
                    <Text style={styles.detailLabel}>{t(`waste.${ty}`)}</Text>
                  </View>
                ))}
              </>
            ) : (
              <Text style={styles.detailEmpty}>
                {t('cal.noPickup', { date: selectedDate ? weekdayDate(selectedDate, lang) : '' })}
              </Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.legendBox}>
        <Legend />
      </View>
    </ScrollView>
  );
}

const SQUARE = 38;

const makeStyles = (c: Theme) => StyleSheet.create({
  // flexGrow + justifyContent: 'center' → kalendarz wyśrodkowany pionowo na ekranie.
  scroll: { padding: 14, paddingBottom: 28, flexGrow: 1, justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12, paddingHorizontal: 4,
  },
  title: { fontSize: 21, fontWeight: '700', color: c.text },
  arrow: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: c.card,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: c.shadow, shadowOpacity: 1, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  arrowOff: { opacity: 0.35 },
  pressed: { opacity: 0.6 },
  arrowTxt: { fontSize: 26, lineHeight: 30, color: c.text, fontWeight: '600' },
  card: {
    backgroundColor: c.card, borderRadius: 18, padding: 8,
    shadowColor: c.shadow, shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  weekRow: { flexDirection: 'row', marginBottom: 4, paddingTop: 4 },
  weekday: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: c.textMuted },
  weekendHead: { color: '#C0504D' },
  row: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  square: {
    width: SQUARE, height: SQUARE, borderRadius: 5, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent',
  },
  stripes: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row' },
  // Lekki highlight/glow z tyłu dnia dzisiejszego; tło kratki pozostaje przezroczyste.
  todayHalo: {
    padding: 3, borderRadius: 9, backgroundColor: c.todayGlow,
    shadowColor: c.todayBorder, shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  // Czarna (jasny motyw) / jasna (ciemny) ramka 2px.
  todayBorder: { borderWidth: 2, borderColor: c.todayBorder },
  selRing: { borderWidth: 1.5, borderColor: c.textMuted },
  dayNum: { fontSize: 15, color: c.text },
  dayOut: { color: 'transparent' },
  dayWeekend: { color: '#C0504D' },
  dayPickup: { color: '#FFFFFF', fontWeight: '800' },
  hint: { textAlign: 'center', color: c.textFaint, fontSize: 12, marginTop: 10 },
  detailSlot: { minHeight: 130, marginTop: 12 },
  detail: {
    backgroundColor: c.card, borderRadius: 14, padding: 14,
    shadowColor: c.shadow, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  detailDate: { fontSize: 13, fontWeight: '700', color: c.textMuted, marginBottom: 8, textTransform: 'capitalize' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3 },
  detailLabel: { fontSize: 15, color: c.text },
  detailEmpty: { fontSize: 14, color: c.textMuted, textTransform: 'capitalize' },
  legendBox: { marginTop: 18 },
});
