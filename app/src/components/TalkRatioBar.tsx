import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

interface Props {
  wordsSelf: number;
  elapsedSeconds: number;
}

const WPS = 130 / 60;

// UPGRADE 6: Shimmer component sweeping across the fill bar
function Shimmer({ color }: { color: string }) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.delay(600),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-80, 200],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        s.shimmer,
        {
          backgroundColor: color,
          transform: [{ translateX }, { skewX: '-20deg' }],
        },
      ]}
    />
  );
}

export function TalkRatioBar({ wordsSelf, elapsedSeconds }: Props) {
  const talkSec = wordsSelf / WPS;
  const ratio = elapsedSeconds > 2
    ? Math.min(100, Math.round((talkSec / elapsedSeconds) * 100))
    : 0;
  const color = ratio > 70 ? '#ec4899' : ratio > 50 ? '#f59e0b' : '#4ade80';

  // BUG 4 FIX + UPGRADE 6: Animated value for width
  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: ratio,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [ratio]);

  const fillWidth = fillAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  // UPGRADE 6: glow dot at leading edge
  const glowDotLeft = fillAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={s.wrap}>
      <View style={s.track}>
        <Animated.View
          style={[
            s.fill,
            {
              width: fillWidth,
              backgroundColor: color,
            },
          ]}
        >
          {/* UPGRADE 6: shimmer effect on fill */}
          <Shimmer color="rgba(255,255,255,0.25)" />
        </Animated.View>

        {/* UPGRADE 6: glowing dot at fill leading edge */}
        <Animated.View
          pointerEvents="none"
          style={[
            s.glowDot,
            {
              left: glowDotLeft,
              backgroundColor: color,
              shadowColor: color,
            },
          ]}
        />
      </View>
      <View style={s.labels}>
        <Text style={[s.you, { color }]}>YOU {ratio}%</Text>
        <Text style={s.listen}>LISTEN {100 - ratio}%</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginHorizontal: 20, marginBottom: 10 },
  track: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 4,
    marginBottom: 5,
    position: 'relative',
    overflow: 'visible',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 40,
    opacity: 0.6,
  },
  glowDot: {
    position: 'absolute',
    top: -3,
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  you: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  listen: { color: '#334155', fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
});
