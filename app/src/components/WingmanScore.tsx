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

const RING_SIZE = 160;
const RING_BORDER = 8;

function ProgressRing({ score, color }: { score: number; color: string }) {
  const deg = (Math.min(Math.max(score, 0), 100) / 100) * 360;
  const rightDeg = Math.min(deg, 180);
  const leftDeg = Math.max(Math.min(deg, 360), 180);

  return (
    <View style={ring.wrap}>
      {/* Track */}
      <View style={ring.track} />
      {/* Glow behind the ring */}
      <View style={[ring.glow, { shadowColor: color }]} />
      {/* Left window: revealed after 50% */}
      <View style={[ring.window, ring.windowLeft]}>
        <View
          style={[
            ring.disc,
            ring.discLeft,
            { borderTopColor: color, borderLeftColor: color, transform: [{ rotate: `${leftDeg - 180}deg` }] },
          ]}
        />
      </View>
      {/* Right window: first half of sweep */}
      <View style={[ring.window, ring.windowRight]}>
        <View
          style={[
            ring.disc,
            ring.discRight,
            { borderTopColor: color, borderRightColor: color, transform: [{ rotate: `${rightDeg}deg` }] },
          ]}
        />
      </View>
    </View>
  );
}

export function WingmanScore({ coachingHistory, elapsedSeconds, wordsSelf, rating = 0 }: Props) {
  const finalScore = computeWingmanScore({
    coachingTipsTaken: coachingHistory.length,
    elapsedSeconds,
    wordsSelf,
    rating,
  });
  const theme = scoreTheme(finalScore);

  const [displayScore, setDisplayScore] = useState(0);
  const entryAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    Animated.timing(entryAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: true,
    }).start(() => {
      // Gentle alive pulse after entry
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.03, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    });

    if (finalScore <= 0) {
      setDisplayScore(0);
      return;
    }

    const duration = 1400;
    const start = Date.now();
    const id = setInterval(() => {
      const t = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(eased * finalScore));
      if (t >= 1) clearInterval(id);
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
              entryAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }),
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
      </View>
      <Text style={s.scoreCaption}>WINGMAN SCORE</Text>
      <View style={[s.labelBadge, { borderColor: `${theme.color}44`, backgroundColor: `${theme.color}14` }]}>
        <Text style={[s.label, { color: theme.color }]}>{theme.label}</Text>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: { alignItems: 'center', gap: 8 },
  ringArea: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: { fontSize: 64, fontWeight: '900', letterSpacing: -4, lineHeight: 68 },
  scoreUnit: { color: '#475569', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  scoreCaption: { color: '#475569', fontSize: 10, fontWeight: '700', letterSpacing: 2.5, marginTop: 2 },
  labelBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  label: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
});

const ring = StyleSheet.create({
  wrap: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  track: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_BORDER,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  glow: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
  },
  window: {
    position: 'absolute',
    width: RING_SIZE / 2,
    height: RING_SIZE,
    overflow: 'hidden',
  },
  windowRight: { right: 0 },
  windowLeft: { left: 0 },
  disc: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_BORDER,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  discRight: { right: 0 },
  discLeft: { left: 0 },
});
