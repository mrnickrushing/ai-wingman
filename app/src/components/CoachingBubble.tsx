import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, StyleSheet, View, TouchableOpacity, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const WORD_INTERVAL = 68;
const PROGRESS_DURATION = 6500;

interface Props {
  text: string | null;
  speaking?: boolean;
  onDismiss?: () => void;
}

function SpeakingDots() {
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0.2))).current;
  useEffect(() => {
    const loops = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(d, { toValue: 1, duration: 280, delay: i * 110, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0.2, duration: 280, useNativeDriver: true }),
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

function SonarRing({ color, anim }: { color: string; anim: Animated.Value }) {
  const ringOpacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.55, 0.15, 0] });
  const ringScale   = anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2.0] });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          alignItems: 'center',
          justifyContent: 'center',
          opacity: ringOpacity,
          transform: [{ scale: ringScale }],
        },
      ]}
    >
      <View style={{ width: 140, height: 140, borderRadius: 70, borderWidth: 1.5, borderColor: color }} />
    </Animated.View>
  );
}

// UPGRADE 10: aiDot as animated pulsing component
function AiDot() {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 1.3, duration: 750, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.6, duration: 750, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scaleAnim, { toValue: 1.0, duration: 750, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 1.0, duration: 750, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[
        s.aiDot,
        { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
      ]}
    />
  );
}

function Word({ value, revealed }: { value: string; revealed: boolean }) {
  const opacity   = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(6)).current;
  useEffect(() => {
    if (revealed) {
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 1, duration: 90, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 90, useNativeDriver: true }),
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
  const slideAnim    = useRef(new Animated.Value(-120)).current;
  const opacityAnim  = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim    = useRef(new Animated.Value(0.88)).current;
  const glowAnim     = useRef(new Animated.Value(0)).current;
  const sonarAnim    = useRef(new Animated.Value(0)).current;
  // BUG 2 FIX: keep a ref to the sonar loop so we can stop it on unmount
  const sonarLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const [revealCount, setRevealCount] = useState(0);

  const words = text ? text.split(/\s+/).filter(Boolean) : [];

  // BUG 2 FIX: cleanup sonar loop on unmount
  useEffect(() => {
    return () => {
      sonarLoopRef.current?.stop();
      sonarLoopRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (text) {
      progressAnim.setValue(1);
      setRevealCount(0);

      // Stop any running sonar loop before starting a new one
      sonarLoopRef.current?.stop();
      sonarLoopRef.current = null;
      sonarAnim.setValue(0);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

      // Entry animation
      Animated.parallel([
        Animated.spring(slideAnim,  { toValue: 0, tension: 76, friction: 11, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(scaleAnim,  { toValue: 1, tension: 76, friction: 11, useNativeDriver: true }),
        // Glow burst then settle
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 250, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        ]),
      ]).start();

      // BUG 2 FIX: Sonar now properly loops with a ref-tracked composite animation
      const sonarLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(sonarAnim, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.delay(400),
          Animated.timing(sonarAnim, { toValue: 0, duration: 1, useNativeDriver: true }),
          Animated.delay(300),
        ])
      );
      sonarLoopRef.current = sonarLoop;
      sonarLoop.start();

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

      return () => {
        clearInterval(interval);
        sonarLoopRef.current?.stop();
        sonarLoopRef.current = null;
      };
    } else {
      sonarLoopRef.current?.stop();
      sonarLoopRef.current = null;
      Animated.parallel([
        Animated.timing(slideAnim,   { toValue: -120, duration: 260, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0,    duration: 180, useNativeDriver: true }),
        Animated.timing(scaleAnim,   { toValue: 0.88, duration: 260, useNativeDriver: true }),
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
      {/* Sonar rings */}
      <SonarRing color="#6366f1" anim={sonarAnim} />

      {/* Glow burst */}
      <Animated.View
        pointerEvents="none"
        style={[s.glowBurst, { opacity: glowAnim }]}
      />

      <LinearGradient
        colors={['rgba(99,102,241,0.26)', 'rgba(139,92,246,0.14)', 'rgba(10,10,30,0.92)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.card}
      >
        <View style={s.topRow}>
          <View style={s.aiTag}>
            {/* UPGRADE 10: animated aiDot */}
            <AiDot />
            <Text style={s.aiTagText}>WINGMAN</Text>
            {speaking && <SpeakingDots />}
          </View>
          {onDismiss && (
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                onDismiss();
              }}
              accessibilityRole="button"
              accessibilityLabel="Dismiss coaching tip"
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
              style={s.dismissBtn}
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
          <Animated.View
            style={[
              s.progressGlowDot,
              {
                left: progressAnim.interpolate({
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
    left: 14,
    right: 14,
    zIndex: 200,
  },
  glowBurst: {
    position: 'absolute',
    top: -14,
    left: -14,
    right: -14,
    bottom: -14,
    borderRadius: 32,
    backgroundColor: '#6366f1',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 32,
  },
  card: {
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.50)',
    gap: 14,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiTag: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  aiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#818cf8',
    shadowColor: '#818cf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
  aiTagText: { color: '#818cf8', fontSize: 11, fontWeight: '900', letterSpacing: 1.6 },
  speakingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  speakingDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#4ade80',
  },
  speakingText: { color: '#4ade80', fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginLeft: 4 },
  dismissBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 99,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismiss: { color: 'rgba(148,163,184,0.7)', fontSize: 13, fontWeight: '700' },
  textWrap: { lineHeight: 28 },
  text: {
    color: '#f1f5f9',
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'visible',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(129,140,248,0.75)',
    borderRadius: 2,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  progressGlowDot: {
    position: 'absolute',
    top: -3,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#818cf8',
    marginLeft: -4,
    shadowColor: '#818cf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
});
