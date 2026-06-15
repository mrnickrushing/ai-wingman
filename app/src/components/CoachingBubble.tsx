import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, StyleSheet, View, TouchableOpacity, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const WORD_INTERVAL = 75;
const PROGRESS_DURATION = 6000;

interface Props {
  text: string | null;
  speaking?: boolean;
  onDismiss?: () => void;
}

function SpeakingDots() {
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0.25))).current;
  useEffect(() => {
    const loops = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(d, { toValue: 1, duration: 300, delay: i * 120, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0.25, duration: 300, useNativeDriver: true }),
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

function Word({ value, revealed }: { value: string; revealed: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(4)).current;
  useEffect(() => {
    if (revealed) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 80, useNativeDriver: true }),
      ]).start();
    }
  }, [revealed]);
  return (
    <Animated.Text style={[s.text, { opacity, transform: [{ translateY }] }]}>
      {value}{' '}
    </Animated.Text>
  );
}

export function CoachingBubble({ text, speaking, onDismiss }: Props) {
  const slideAnim   = useRef(new Animated.Value(-110)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim   = useRef(new Animated.Value(0.9)).current;
  const glowAnim    = useRef(new Animated.Value(0)).current;
  const [revealCount, setRevealCount] = useState(0);

  const words = text ? text.split(/\s+/).filter(Boolean) : [];

  useEffect(() => {
    if (text) {
      progressAnim.setValue(1);
      setRevealCount(0);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, tension: 72, friction: 11, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 72, friction: 11, useNativeDriver: true }),
        // Glow pulse on entry
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
        ]),
      ]).start();

      const count = words.length;
      let i = 0;
      const interval = setInterval(() => {
        i += 1;
        setRevealCount(i);
        if (i >= count) {
          clearInterval(interval);
          Animated.timing(progressAnim, {
            toValue: 0,
            duration: PROGRESS_DURATION,
            useNativeDriver: false,
          }).start(() => { onDismiss?.(); });
        }
      }, WORD_INTERVAL);

      return () => clearInterval(interval);
    } else {
      Animated.parallel([
        Animated.timing(slideAnim,   { toValue: -110, duration: 280, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(scaleAnim,   { toValue: 0.9, duration: 280, useNativeDriver: true }),
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
      {/* Entry glow burst behind the card */}
      <Animated.View
        pointerEvents="none"
        style={[s.glowBurst, { opacity: glowAnim }]}
      />

      <LinearGradient
        colors={['rgba(99,102,241,0.22)', 'rgba(139,92,246,0.12)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.card}
      >
        <View style={s.topRow}>
          <View style={s.aiTag}>
            <Text style={s.aiTagText}>🎧 WINGMAN</Text>
            {speaking && <SpeakingDots />}
          </View>
          {onDismiss && (
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                onDismiss();
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={s.dismiss}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={s.textWrap}>
          {words.map((w, i) => (
            <Word key={`${i}-${w}`} value={w} revealed={i < revealCount} />
          ))}
        </Text>

        {/* Auto-dismiss progress */}
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
  glowBurst: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
  },
  card: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.40)',
    gap: 12,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiTag: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiTagText: { color: '#8b5cf6', fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  speakingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  speakingDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#4ade80',
  },
  speakingText: { color: '#4ade80', fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginLeft: 4 },
  dismiss: { color: 'rgba(148,163,184,0.5)', fontSize: 14, fontWeight: '600' },
  textWrap: { lineHeight: 26 },
  text: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 26,
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
    backgroundColor: 'rgba(99,102,241,0.65)',
    borderRadius: 1,
  },
});
