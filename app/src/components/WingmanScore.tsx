import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { computeWingmanScore, scoreTheme } from '../utils/scoring';

interface Props {
  coachingHistory: { length: number };
  elapsedSeconds: number;
  wordsSelf: number;
  rating?: number;
}

const RING_SIZE = 168;
const RING_BORDER = 9;

// Confetti particle for high scores
function ConfettiParticle({ color, delay }: { color: string; delay: number }) {
  const xAnim   = useRef(new Animated.Value(0)).current;
  const yAnim   = useRef(new Animated.Value(0)).current;
  const opAnim  = useRef(new Animated.Value(0)).current;
  const rotAnim = useRef(new Animated.Value(0)).current;

  const startX = (Math.random() - 0.5) * 180;
  const endX   = startX + (Math.random() - 0.5) * 60;
  const endY   = -(80 + Math.random() * 80);

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opAnim,  { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(xAnim,   { toValue: endX, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(yAnim,   { toValue: endY, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(rotAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(400),
          Animated.timing(opAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]),
      ]),
    ]).start();
  }, []);

  const rotate = rotAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(Math.random() - 0.5) * 540}deg`] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        s.confettiParticle,
        { backgroundColor: color, opacity: opAnim, transform: [{ translateX: xAnim }, { translateY: yAnim }, { rotate }] },
      ]}
    />
  );
}

function ProgressRing({ score, color }: { score: number; color: string }) {
  const deg = (Math.min(Math.max(score, 0), 100) / 100) * 360;
  const rightDeg = Math.min(deg, 180);
  const leftDeg  = Math.max(Math.min(deg, 360), 180);

  return (
    <View style={ring.wrap}>
      {/* Track */}
      <View style={ring.track} />
      {/* Outer glow */}
      <View style={[ring.glow, { shadowColor: color }]} />
      {/* Left clip */}
      <View style={[ring.window, ring.windowLeft]}>
        <View
          style={[
            ring.disc, ring.discLeft,
            { borderTopColor: color, borderLeftColor: color, transform: [{ rotate: `${leftDeg - 180}deg` }] },
          ]}
        />
      </View>
      {/* Right clip */}
      <View style={[ring.window, ring.windowRight]}>
        <View
          style={[
            ring.disc, ring.discRight,
            { borderTopColor: color, borderRightColor: color, transform: [{ rotate: `${rightDeg}deg` }] },
          ]}
        />
      </View>
    </View>
  );
}

const CONFETTI_COLORS = ['#6366f1', '#ec4899', '#22d3ee', '#f59e0b', '#4ade80', '#a78bfa'];

export function WingmanScore({ coachingHistory, elapsedSeconds, wordsSelf, rating = 0 }: Props) {
  const finalScore = computeWingmanScore({
    coachingTipsTaken: coachingHistory.length,
    elapsedSeconds,
    wordsSelf,
    rating,
  });
  const theme = scoreTheme(finalScore);

  const [displayScore, setDisplayScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const entryAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    Animated.timing(entryAnim, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.back(1.6)),
      useNativeDriver: true,
    }).start(() => {
      // Breathing pulse after entry
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.035, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,     duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    });

    if (finalScore <= 0) {
      setDisplayScore(0);
      return;
    }

    const duration = 1600;
    const start = Date.now();
    const id = setInterval(() => {
      const t = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(eased * finalScore);
      setDisplayScore(current);
      if (t >= 1) {
        clearInterval(id);
        // Trigger confetti for great scores
        if (finalScore >= 80) {
          setShowConfetti(true);
        }
      }
    }, 12);

    return () => clearInterval(id);
  }, [finalScore]);

  return (
    <Animated.View
      style={[
        s.container,
        {
          opacity: entryAnim,
          transform: [
            { scale: Animated.multiply(
              entryAnim.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }),
              pulseAnim
            )},
          ],
        },
      ]}
    >
      <View style={s.ringArea}>
        <ProgressRing score={displayScore} color={theme.color} />
        <View style={s.numberOverlay}>
          <Text style={[s.score, { color: theme.color }]}>{displayScore}</Text>
          <Text style={s.scoreUnit}>/ 100</Text>
        </View>
        {/* Confetti burst */}
        {showConfetti && CONFETTI_COLORS.map((c, i) =>
          Array.from({ length: 3 }).map((_, j) => (
            <ConfettiParticle key={`${i}-${j}`} color={c} delay={i * 80 + j * 30} />
          ))
        )}
      </View>
      <Text style={s.scoreCaption}>WINGMAN SCORE</Text>
      <View style={[s.labelBadge, { borderColor: theme.color + '50', backgroundColor: theme.color + '16' }]}>
        <Text style={[s.label, { color: theme.color }]}>{theme.label}</Text>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: { alignItems: 'center', gap: 10 },
  ringArea: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  numberOverlay: {
    position: 'absolute',
    top: 0, right: 0, bottom: 0, left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: { fontSize: 68, fontWeight: '900', letterSpacing: -5, lineHeight: 72 },
  scoreUnit: { color: '#3d3d5c', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  scoreCaption: { color: '#3d3d5c', fontSize: 10, fontWeight: '800', letterSpacing: 3, marginTop: 2 },
  labelBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  label: { fontSize: 15, fontWeight: '900', letterSpacing: -0.2 },
  confettiParticle: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 2,
  },
});

const ring = StyleSheet.create({
  wrap: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  track: {
    position: 'absolute',
    width: RING_SIZE, height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_BORDER,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  glow: {
    position: 'absolute',
    width: RING_SIZE, height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 22,
  },
  window: {
    position: 'absolute',
    width: RING_SIZE / 2, height: RING_SIZE,
    overflow: 'hidden',
  },
  windowRight: { right: 0 },
  windowLeft:  { left: 0 },
  disc: {
    position: 'absolute',
    width: RING_SIZE, height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_BORDER,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  discRight: { right: 0 },
  discLeft:  { left: 0 },
});
