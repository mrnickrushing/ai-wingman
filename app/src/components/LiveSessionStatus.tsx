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

// UPGRADE 4: Sonar ring emanating from the online connection dot
function SonarConnDot() {
  const sonarAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Sonar ring loop
    const sonarLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sonarAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(600),
        Animated.timing(sonarAnim, { toValue: 0, duration: 1, useNativeDriver: true }),
      ])
    );
    sonarLoop.start();

    // Dot brightness pulse
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.7, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    pulseLoop.start();

    return () => {
      sonarLoop.stop();
      pulseLoop.stop();
    };
  }, []);

  const ringScale = sonarAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 3.2] });
  const ringOpacity = sonarAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.6, 0.2, 0] });

  return (
    <View style={s.connDotWrap}>
      {/* sonar ring */}
      <Animated.View
        pointerEvents="none"
        style={[
          s.sonarRing,
          { opacity: ringOpacity, transform: [{ scale: ringScale }] },
        ]}
      />
      {/* main dot */}
      <Animated.View
        style={[
          s.connDot,
          s.connOnline,
          { opacity: pulseAnim },
        ]}
      />
    </View>
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
  // BUG 5 FIX: threshold changed from -50 to -60 (more sensitive)
  const hearing = isRecording && micLevelDb !== null && micLevelDb > -60;
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
        {/* UPGRADE 4: sonar dot when online, static dot when offline */}
        {isConnected ? (
          <SonarConnDot />
        ) : (
          <View style={[s.connDot, s.connOffline]} />
        )}
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
  // UPGRADE 4: wrapper for sonar dot
  connDotWrap: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sonarRing: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#4ade80',
  },
  connDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connOnline: {
    backgroundColor: '#4ade80',
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
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
