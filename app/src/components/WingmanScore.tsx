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

const RING_SIZE = 140;
const RING_BORDER = 6;

// Circular progress ring with no SVG / no new deps. Two half-circle windows
// (left + right) each clip a full ring-bordered disc. Rotating each disc sweeps
// its colored half across the window — the classic two-semicircle gauge trick.
// Right window covers 0–180°, left window covers 180–360°.
function ProgressRing({ score, color }: { score: number; color: string }) {
  const deg = (Math.min(Math.max(score, 0), 100) / 100) * 360;
  const rightDeg = Math.min(deg, 180);
  const leftDeg = Math.max(Math.min(deg, 360), 180);

  return (
    <View style={ring.wrap}>
      {/* Background track */}
      <View style={ring.track} />

      {/* Left window: revealed once score passes 50% */}
      <View style={[ring.window, ring.windowLeft]}>
        <View
          style={[
            ring.disc,
            ring.discLeft,
            { borderTopColor: color, borderLeftColor: color, transform: [{ rotate: `${leftDeg - 180}deg` }] },
          ]}
        />
      </View>

      {/* Right window: first half of the sweep */}
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

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    Animated.timing(entryAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: true,
    }).start();

    if (finalScore <= 0) {
      setDisplayScore(0);
      return;
    }

    const duration = 1200;
    const start = Date.now();
    const id = setInterval(() => {
      const t = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
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
            { scale: entryAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
          ],
        },
      ]}
    >
      <View style={s.ringArea}>
        <ProgressRing score={displayScore} color={theme.color} />
        <View style={s.numberOverlay}>
          <Text style={[s.score, { color: theme.color }]}>{displayScore}</Text>
        </View>
      </View>
      <Text style={s.scoreCaption}>WINGMAN SCORE</Text>
      <Text style={[s.label, { color: theme.color }]}>{theme.label}</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: { alignItems: 'center', gap: 6 },
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
  score: { fontSize: 72, fontWeight: '900', letterSpacing: -4 },
  scoreCaption: {
    color: '#475569', fontSize: 10, fontWeight: '700', letterSpacing: 2.5, marginTop: 4,
  },
  label: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
});

const ring = StyleSheet.create({
  wrap: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  track: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_BORDER,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  // Each window clips a vertical half of the ring area; the disc inside rotates
  // to sweep its colored border edge across that half.
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
  // Disc positioned so the clipped half aligns with its window.
  discRight: { right: 0 },
  discLeft: { left: 0 },
});
