import React from 'react';
import { View } from 'react-native';
import { WASTE_TYPES, WasteTypeId } from '../data/schedule';

export function WasteDot({ type, size = 8 }: { type: WasteTypeId; size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: WASTE_TYPES[type].color,
      }}
    />
  );
}
