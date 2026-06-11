import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WASTE_TYPES, WASTE_TYPE_ORDER } from '../data/schedule';
import { WasteDot } from './WasteDot';
import { theme } from '../theme';

export function Legend() {
  return (
    <View style={styles.wrap}>
      {WASTE_TYPE_ORDER.map((id) => (
        <View key={id} style={styles.item}>
          <WasteDot type={id} size={11} />
          <Text style={styles.label}>{WASTE_TYPES[id].short}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    rowGap: 8,
    paddingHorizontal: 4,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 12, color: theme.textMuted },
});
