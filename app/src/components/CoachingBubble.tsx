import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, View, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  text: string | null;
  speaking?: boolean;
  onDismiss?: () => void;
}

function SpeakingDots() {
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0.3))).current;
  useEffect(() => {
    const loops = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(d, { toValue: 1, duration: 320, delay: i * 140, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0.3, duration: 320, useNativeDriver: true }),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, []);
  return (
    <View style={s.speakingRow}>
      {dots.map((d, i) => (
        <Animated.View key={i} style={[s.speakingDot, { opacity: d }]} />
      ))}
      <Text style={s.speakingText}>WHISPERING</Text>
    </View>
  );
}

export function CoachingBubble({ text, speaking, onDismiss }: Props) {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (text) {
      progressAnim.setValue(1);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0, tension: 70, friction: 11, useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(scaleAnim, {
          toValue: 1, tension: 70, friction: 11, useNativeDriver: true,
        }),
      ]).start();
      // Progress bar drains over 6s
      Animated.timing(progressAnim, {
        toValue: 0, duration: 6000, useNativeDriver: false,
      }).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -100, duration: 260, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.92, duration: 260, useNativeDriver: true }),
      ]).start();
    }
  }, [text]);

  if (!text) return null;

  return (
    <Animated.View
      style={[
        s.container,
        { opacity: opacityAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] },
      ]}
    >
      <LinearGradient
        colors={['rgba(99,102,241,0.18)', 'rgba(139,92,246,0.1)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.card}
      >
        {/* Gradient border effect */}
        <View style={s.borderGlow} />

        <View style={s.topRow}>
          <View style={s.aiTag}>
            <Text style={s.aiTagText}>🎧 WINGMAN</Text>
            {speaking && <SpeakingDots />}
          </View>
          {onDismiss && (
            <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={s.dismiss}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={s.text}>{text}</Text>

        {/* Auto-dismiss progress bar */}
        <View style={s.progressTrack}>
          <Animated.View
            style={[
              s.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    zIndex: 200,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.35)',
    gap: 10,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  borderGlow: {
    position: 'absolute',
    inset: 0,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.2)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiTagText: {
    color: '#8b5cf6',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  speakingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  speakingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4ade80',
  },
  speakingText: {
    color: '#4ade80',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginLeft: 4,
  },
  dismiss: {
    color: 'rgba(148,163,184,0.5)',
    fontSize: 13,
    fontWeight: '600',
  },
  text: {
    color: '#f1f5f9',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(99,102,241,0.6)',
    borderRadius: 1,
  },
});
