import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
      duration: 1000,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [weight, delay]);

  const width = anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <View style={s.track}>
      <Animated.View style={[s.fill, { width, backgroundColor: accent }]} />
      {/* Trailing glow dot */}
      <Animated.View
        style={[
          s.glowDot,
          { left: width, backgroundColor: accent, shadowColor: accent },
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
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        s.card,
        {
          opacity: containerAnim,
          transform: [{
            translateY: containerAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }),
          }],
        },
      ]}
    >
      {/* Mode color accent bar at top */}
      <LinearGradient
        colors={[accent + 'cc', accent + '44', 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={s.accentBar}
      />

      <View style={s.header}>
        <View style={[s.modeDot, { backgroundColor: accent + '30', borderColor: accent + '60' }]}>
          <View style={[s.modeDotInner, { backgroundColor: accent }]} />
        </View>
        <View style={s.headerText}>
          <Text style={s.label}>MODE SCORECARD</Text>
          <Text style={[s.title, { color: accent }]}>{title}</Text>
          {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>

      <View style={s.metricList}>
        {metrics.map((metric, index) => (
          <View key={metric.label} style={s.metric}>
            <View style={s.metricTop}>
              <Text style={s.metricLabel}>{metric.label}</Text>
              <Text style={[s.metricValue, { color: accent }]}>{metric.value}</Text>
            </View>
            <AnimatedBar weight={metric.weight ?? 60} accent={accent} delay={index * 120} />
            {metric.detail ? <Text style={s.detail}>{metric.detail}</Text> : null}
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#0c0c1e',
    borderWidth: 1,
    borderColor: '#1a1a36',
    borderRadius: 18,
    overflow: 'hidden',
    gap: 0,
  },
  accentBar: {
    height: 3,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    paddingBottom: 14,
  },
  modeDot: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  modeDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  headerText: { flex: 1, gap: 3 },
  label: { color: '#3d3d5c', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  title: { fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  subtitle: { color: '#7c7caa', fontSize: 12, lineHeight: 17 },
  metricList: { gap: 2, paddingHorizontal: 14, paddingBottom: 16 },
  metric: {
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 2,
  },
  metricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  metricLabel: { color: '#7c7caa', fontSize: 12, fontWeight: '800' },
  metricValue: { fontSize: 15, fontWeight: '900' },
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
    shadowOpacity: 1,
    shadowRadius: 7,
    elevation: 4,
  },
  detail: { color: '#7c7caa', fontSize: 12, lineHeight: 17 },
});
