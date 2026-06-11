import React, { useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, PanResponder, Animated, ScrollView,
} from 'react-native';
import {
  EVENTS_BY_DATE, SCHEDULE_YEAR, WASTE_TYPES, WasteTypeId, toISO,
} from '../data/schedule';
import { WEEKDAYS_SHORT, mondayIndex, monthTitle, weekdayDate } from '../utils/format';
import { WasteDot } from './WasteDot';
import { Legend } from './Legend';
import { theme } from '../theme';

interface Cell {
  day: number;
  iso: string;
  inMonth: boolean;
  isToday: boolean;
  types: WasteTypeId[];
}

function buildGrid(month0: number, todayISO: string): Cell[] {
  const first = new Date(SCHEDULE_YEAR, month0, 1);
  const lead = mondayIndex(first.getDay()); // ile dni z poprzedniego miesiąca
  const daysInMonth = new Date(SCHEDULE_YEAR, month0 + 1, 0).getDate();
  const cells: Cell[] = [];

  // dni z poprzedniego miesiąca (wypełniacze)
  const prevDays = new Date(SCHEDULE_YEAR, month0, 0).getDate();
  for (let i = lead - 1; i >= 0; i--) {
    const d = prevDays - i;
    cells.push({ day: d, iso: '', inMonth: false, isToday: false, types: [] });
  }
  // bieżący miesiąc
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = toISO(SCHEDULE_YEAR, month0, d);
    cells.push({
      day: d,
      iso,
      inMonth: true,
      isToday: iso === todayISO,
      types: EVENTS_BY_DATE.get(iso) ?? [],
    });
  }
  // dopełnienie do pełnych tygodni
  while (cells.length % 7 !== 0) {
    cells.push({ day: 0, iso: '', inMonth: false, isToday: false, types: [] });
  }
  return cells;
}

export function CalendarView({ today }: { today: Date }) {
  const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate());
  const initialMonth = today.getFullYear() === SCHEDULE_YEAR ? today.getMonth() : 0;
  const [month, setMonth] = useState(initialMonth);
  const [selected, setSelected] = useState<string | null>(
    today.getFullYear() === SCHEDULE_YEAR ? todayISO : null,
  );

  const slide = useRef(new Animated.Value(0)).current;

  const go = (dir: -1 | 1) => {
    const next = month + dir;
    if (next < 0 || next > 11) return;
    setSelected(null);
    Animated.sequence([
      Animated.timing(slide, { toValue: dir * -18, duration: 90, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start();
    setMonth(next);
  };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_e, g) => {
        if (g.dx <= -40) go(1);
        else if (g.dx >= 40) go(-1);
      },
    }),
  ).current;

  const grid = useMemo(() => buildGrid(month, todayISO), [month, todayISO]);
  const rows = useMemo(() => {
    const r: Cell[][] = [];
    for (let i = 0; i < grid.length; i += 7) r.push(grid.slice(i, i + 7));
    return r;
  }, [grid]);

  const selectedTypes = selected ? EVENTS_BY_DATE.get(selected) ?? [] : [];
  const selectedDate = useMemo(() => {
    if (!selected) return null;
    const [y, m, d] = selected.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [selected]);

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* nagłówek miesiąca + strzałki */}
      <View style={styles.header}>
        <Pressable
          onPress={() => go(-1)}
          disabled={month === 0}
          style={({ pressed }) => [styles.arrow, (month === 0) && styles.arrowOff, pressed && styles.pressed]}
          hitSlop={10}
        >
          <Text style={styles.arrowTxt}>‹</Text>
        </Pressable>
        <Text style={styles.title}>{monthTitle(month, SCHEDULE_YEAR)}</Text>
        <Pressable
          onPress={() => go(1)}
          disabled={month === 11}
          style={({ pressed }) => [styles.arrow, (month === 11) && styles.arrowOff, pressed && styles.pressed]}
          hitSlop={10}
        >
          <Text style={styles.arrowTxt}>›</Text>
        </Pressable>
      </View>

      <Animated.View style={[styles.card, { transform: [{ translateX: slide }] }]} {...pan.panHandlers}>
        {/* dni tygodnia */}
        <View style={styles.weekRow}>
          {WEEKDAYS_SHORT.map((w, i) => (
            <Text key={w} style={[styles.weekday, i >= 5 && styles.weekend]}>{w}</Text>
          ))}
        </View>

        {/* siatka */}
        {rows.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((c, ci) => {
              const isWeekend = ci >= 5;
              const isSel = c.inMonth && c.iso === selected;
              return (
                <Pressable
                  key={ci}
                  style={styles.cell}
                  disabled={!c.inMonth}
                  onPress={() => setSelected(c.iso)}
                >
                  <View style={[styles.dayWrap, c.isToday && styles.todayWrap, isSel && !c.isToday && styles.selWrap]}>
                    <Text
                      style={[
                        styles.dayNum,
                        !c.inMonth && styles.dayOut,
                        isWeekend && c.inMonth && styles.dayWeekend,
                        c.isToday && styles.dayToday,
                      ]}
                    >
                      {c.inMonth ? c.day : ''}
                    </Text>
                  </View>
                  <View style={styles.dots}>
                    {c.types.slice(0, 3).map((t) => (
                      <WasteDot key={t} type={t} size={7} />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </Animated.View>

      <Text style={styles.hint}>Przesuń w lewo / prawo, aby zmienić miesiąc</Text>

      {/* szczegóły wybranego dnia */}
      {selected && (
        <View style={styles.detail}>
          {selectedTypes.length > 0 ? (
            <>
              <Text style={styles.detailDate}>{selectedDate ? weekdayDate(selectedDate) : ''}</Text>
              {selectedTypes.map((t) => (
                <View key={t} style={styles.detailRow}>
                  <WasteDot type={t} size={12} />
                  <Text style={styles.detailLabel}>{WASTE_TYPES[t].label}</Text>
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.detailEmpty}>
              {selectedDate ? weekdayDate(selectedDate) : ''} — brak wywozu
            </Text>
          )}
        </View>
      )}

      <View style={styles.legendBox}>
        <Legend />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 14, paddingBottom: 28 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12, paddingHorizontal: 4,
  },
  title: { fontSize: 21, fontWeight: '700', color: theme.text },
  arrow: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: theme.card,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: theme.shadow, shadowOpacity: 1, shadowRadius: 5, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  arrowOff: { opacity: 0.35 },
  pressed: { opacity: 0.6 },
  arrowTxt: { fontSize: 26, lineHeight: 30, color: theme.text, fontWeight: '600' },
  card: {
    backgroundColor: theme.card, borderRadius: 18, padding: 8,
    shadowColor: theme.shadow, shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  weekRow: { flexDirection: 'row', marginBottom: 4, paddingTop: 4 },
  weekday: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: theme.textMuted },
  weekend: { color: '#C0504D' },
  row: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 4, minHeight: 46 },
  dayWrap: {
    width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
  },
  todayWrap: { backgroundColor: theme.todayBg, borderWidth: 1.5, borderColor: theme.todayRing },
  selWrap: { backgroundColor: theme.bg, borderWidth: 1, borderColor: theme.border },
  dayNum: { fontSize: 15, color: theme.text },
  dayOut: { color: 'transparent' },
  dayWeekend: { color: '#C0504D' },
  dayToday: { fontWeight: '800', color: theme.primary },
  dots: { flexDirection: 'row', gap: 3, marginTop: 3, height: 8, alignItems: 'center' },
  hint: { textAlign: 'center', color: theme.textFaint, fontSize: 12, marginTop: 10 },
  detail: {
    backgroundColor: theme.card, borderRadius: 14, padding: 14, marginTop: 12,
    shadowColor: theme.shadow, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  detailDate: { fontSize: 13, fontWeight: '700', color: theme.textMuted, marginBottom: 8, textTransform: 'capitalize' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 3 },
  detailLabel: { fontSize: 15, color: theme.text },
  detailEmpty: { fontSize: 14, color: theme.textMuted, textTransform: 'capitalize' },
  legendBox: { marginTop: 18 },
});
