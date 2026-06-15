import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

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

function AnimatedBar({ weight, accent, delay }: { weight: number; accent: string; delay: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.max(12, Math.min(100, weight)),
      duration: 900,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [weight, delay]);

  const width = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={s.track}>
      <Animated.View style={[s.fill, { width, backgroundColor: accent }]} />
      {/* Trailing glow dot */}
      <Animated.View
        style={[
          s.glowDot,
          {
            left: width,
            backgroundColor: accent,
            shadowColor: accent,
          },
        ]}
      />
    </View>
  );
}

export function SessionScorecard({ title, accent, subtitle, metrics }: Props) {
  const containerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(containerAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        s.card,
        {
          opacity: containerAnim,
          transform: [
            {
              translateY: containerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [16, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={s.header}>
        <Text style={s.label}>MODE SCORECARD</Text>
        <Text style={[s.title, { color: accent }]}>{title}</Text>
        {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={s.metricList}>
        {metrics.map((metric, index) => (
          <View key={metric.label} style={s.metric}>
            <View style={s.metricTop}>
              <Text style={s.metricLabel}>{metric.label}</Text>
              <Text style={[s.metricValue, { color: accent }]}>{metric.value}</Text>
            </View>
            <AnimatedBar
              weight={metric.weight ?? 60}
              accent={accent}
              delay={index * 160}
            />
            {metric.detail ? <Text style={s.detail}>{metric.detail}</Text> : null}
          </View>
        ))}
      </View>
    </Animated.View>
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
  metricList: { gap: 12 },
  metric: {
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: 10,
  },
  metricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  metricLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '800' },
  metricValue: { fontSize: 14, fontWeight: '900' },
  track: {
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'visible',
    position: 'relative',
  },
  fill: { height: '100%', borderRadius: 999, position: 'absolute', top: 0, left: 0 },
  glowDot: {
    position: 'absolute',
    top: -2,
    width: 11,
    height: 11,
    borderRadius: 6,
    marginLeft: -5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  detail: { color: '#cbd5e1', fontSize: 12, lineHeight: 17 },
});
