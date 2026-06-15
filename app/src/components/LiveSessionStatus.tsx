import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated, Easing } from 'react-native';
import { useSessionStore } from '../store/sessionStore';

function age(timestamp: number | null): number | null {
  return timestamp ? (Date.now() - timestamp) / 1000 : null;
}

function AnimatedPillDot({ color }: { color: string }) {
  const pulse = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.7, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[
        s.pillDot,
        {
          backgroundColor: color,
          opacity: pulse,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.9,
          shadowRadius: 4,
        },
      ]}
    />
  );
}

export function LiveSessionStatus() {
  const {
    isRecording,
    isConnected,
    currentCoaching,
    lastTranscriptAt,
    micLevelDb,
  } = useSessionStore();

  const transcriptAge = age(lastTranscriptAt);
  const hearing = isRecording && micLevelDb !== null && micLevelDb > -50;
  const transcribing = transcriptAge !== null && transcriptAge < 12;

  const states = [
    { label: 'Hearing you',  active: hearing,                   color: '#22d3ee' },
    { label: 'Transcribing', active: transcribing,              color: '#a78bfa' },
    { label: 'Coaching',     active: Boolean(currentCoaching),  color: '#4ade80' },
  ];

  return (
    <View style={s.wrap}>
      {/* Connection indicator */}
      <View style={s.connRow}>
        <View style={[s.connDot, isConnected ? s.connOnline : s.connOffline]} />
        <Text style={[s.connLabel, isConnected ? s.connLabelOnline : s.connLabelOffline]}>
          {isConnected ? 'Connected' : 'Offline'}
        </Text>
      </View>

      {/* State pills */}
      <View style={s.pillRow}>
        {states.map((item) => (
          <View
            key={item.label}
            style={[
              s.pill,
              item.active && {
                backgroundColor: item.color + '14',
                borderColor: item.color + '40',
                shadowColor: item.color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 3,
              },
            ]}
          >
            {item.active && <AnimatedPillDot color={item.color} />}
            <Text style={[s.pillText, item.active && { color: item.color }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 9,
  },
  connRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  connDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connOnline: { backgroundColor: '#4ade80', shadowColor: '#4ade80', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4 },
  connOffline: { backgroundColor: '#3d3d5c' },
  connLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  connLabelOnline: { color: '#4ade80' },
  connLabelOffline: { color: '#3d3d5c' },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillText: { color: '#3d3d5c', fontSize: 12, fontWeight: '800' },
});
