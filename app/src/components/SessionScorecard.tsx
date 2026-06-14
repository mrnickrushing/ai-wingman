import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type SessionScoreMetric = {
  label: string;
  value: string;
  detail?: string;
  weight?: number;
};

type Props = {
  title: string;
  accent: string;
  subtitle?: string;
  metrics: SessionScoreMetric[];
};

export function SessionScorecard({ title, accent, subtitle, metrics }: Props) {
  return (
    <View style={s.card}>
      <View style={s.header}>
        <Text style={s.label}>MODE SCORECARD</Text>
        <Text style={[s.title, { color: accent }]}>{title}</Text>
        {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={s.metricList}>
        {metrics.map((metric) => (
          <View key={metric.label} style={s.metric}>
            <View style={s.metricTop}>
              <Text style={s.metricLabel}>{metric.label}</Text>
              <Text style={[s.metricValue, { color: accent }]}>{metric.value}</Text>
            </View>
            <View style={s.track}>
              <View
                style={[
                  s.fill,
                  { width: `${Math.max(12, Math.min(100, metric.weight ?? 60))}%`, backgroundColor: accent },
                ]}
              />
            </View>
            {metric.detail ? <Text style={s.detail}>{metric.detail}</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 14,
    gap: 12,
  },
  header: { gap: 4 },
  label: { color: '#64748b', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  title: { fontSize: 17, fontWeight: '900' },
  subtitle: { color: '#cbd5e1', fontSize: 12, lineHeight: 17 },
  metricList: { gap: 10 },
  metric: {
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: 10,
  },
  metricTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  metricLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '800' },
  metricValue: { fontSize: 14, fontWeight: '900' },
  track: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 999 },
  detail: { color: '#cbd5e1', fontSize: 12, lineHeight: 17 },
});
