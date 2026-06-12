import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WASTE_TYPE_ORDER } from '../data/schedule';
import { WasteDot } from './WasteDot';
import { usePrefs } from '../prefs';
import { Theme } from '../theme';

export function Legend() {
  const { palette, t } = usePrefs();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  return (
    <View style={styles.wrap}>
      {WASTE_TYPE_ORDER.map((id) => (
        <View key={id} style={styles.item}>
          <WasteDot type={id} size={11} />
          <Text style={styles.label}>{t(`wasteShort.${id}`)}</Text>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (c: Theme) => StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    rowGap: 8,
    paddingHorizontal: 4,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 12, color: c.textMuted },
});
