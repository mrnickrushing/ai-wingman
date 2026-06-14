import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type ChecklistItem = {
  label: string;
  detail: string;
  ready: boolean;
};

type Props = {
  title: string;
  subtitle: string;
  items: ChecklistItem[];
};

export function SessionPrepChecklist({ title, subtitle, items }: Props) {
  const readyCount = items.filter((item) => item.ready).length;
  const ready = readyCount === items.length;

  return (
    <View style={s.card}>
      <View style={s.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{title}</Text>
          <Text style={s.subtitle}>{subtitle}</Text>
        </View>
        <View style={[s.badge, ready ? s.badgeReady : s.badgeNotReady]}>
          <Text style={[s.badgeText, ready ? s.badgeTextReady : s.badgeTextNotReady]}>
            {readyCount}/{items.length}
          </Text>
        </View>
      </View>

      <View style={s.list}>
        {items.map((item) => (
          <View key={item.label} style={s.row}>
            <View style={[s.dot, item.ready ? s.dotReady : s.dotPending]} />
            <View style={{ flex: 1 }}>
              <Text style={s.rowLabel}>{item.label}</Text>
              <Text style={s.rowDetail}>{item.detail}</Text>
            </View>
            <Text style={[s.rowState, item.ready ? s.rowStateReady : s.rowStatePending]}>
              {item.ready ? 'Ready' : 'Missing'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginTop: 8,
  },
  headerRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  title: { color: '#f1f5f9', fontSize: 15, fontWeight: '800' },
  subtitle: { color: '#64748b', fontSize: 12, marginTop: 4, lineHeight: 17 },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  badgeReady: { backgroundColor: 'rgba(74,222,128,0.12)', borderColor: 'rgba(74,222,128,0.3)' },
  badgeNotReady: { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.28)' },
  badgeText: { fontSize: 12, fontWeight: '800' },
  badgeTextReady: { color: '#4ade80' },
  badgeTextNotReady: { color: '#f59e0b' },
  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotReady: { backgroundColor: '#4ade80' },
  dotPending: { backgroundColor: '#f59e0b' },
  rowLabel: { color: '#f1f5f9', fontSize: 13, fontWeight: '700' },
  rowDetail: { color: '#64748b', fontSize: 11, marginTop: 2, lineHeight: 16 },
  rowState: { fontSize: 11, fontWeight: '700' },
  rowStateReady: { color: '#4ade80' },
  rowStatePending: { color: '#f59e0b' },
});
