import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface LiveStatChip {
  icon: string;
  value: string;
  label: string;
  color?: string;
}

interface Props {
  chips: LiveStatChip[];
}

export function LiveStats({ chips }: Props) {
  return (
    <View style={s.row}>
      {chips.map((chip, i) => (
        <View key={i} style={s.chip}>
          <Text style={s.icon}>{chip.icon}</Text>
          <Text style={[s.value, chip.color ? { color: chip.color } : null]} numberOfLines={1}>
            {chip.value}
          </Text>
          <Text style={s.label} numberOfLines={1}>{chip.label}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  chip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 1,
  },
  icon: { fontSize: 13 },
  value: { color: '#f1f5f9', fontSize: 16, fontWeight: '800' },
  label: { color: '#475569', fontSize: 9, fontWeight: '600', letterSpacing: 0.5 },
});
