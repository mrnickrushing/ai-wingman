import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';

interface Props {
  isActive: boolean;
  color?: string;
  inactiveColor?: string;
  barCount?: number;
  height?: number;
}

export function AudioWaveform({ isActive, color = '#22d3ee', inactiveColor = '#1e293b', barCount = 28, height = 60 }: Props) {
  const bars = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.12))
  ).current;
  const loopRefs = useRef<Animated.CompositeAnimation[]>([]);
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loopRefs.current.forEach(l => l.stop());
    loopRefs.current = [];

    if (isActive) {
      // BUG 9 FIX + UPGRADE 5: Animate glowAnim and apply as shadowOpacity
      Animated.timing(glowAnim, { toValue: 1, duration: 300, useNativeDriver: false }).start();

      bars.forEach((bar, i) => {
        // Create organic wave-like motion using offset phases
        const phase = (i / barCount) * Math.PI * 2;
        const minH = 0.05 + Math.sin(phase) * 0.03 + 0.03;
        const maxH = 0.35 + Math.sin(phase * 0.7 + 1) * 0.30 + 0.30;
        const dur = 280 + Math.sin(phase * 1.3) * 120 + 120;
        const delayMs = i * 18;

        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(bar, {
              toValue: maxH,
              duration: dur,
              delay: delayMs,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: false,
            }),
            Animated.timing(bar, {
              toValue: minH,
              duration: dur * 0.85,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: false,
            }),
          ])
        );
        loopRefs.current.push(loop);
        loop.start();
      });
    } else {
      Animated.timing(glowAnim, { toValue: 0, duration: 400, useNativeDriver: false }).start();
      bars.forEach((bar, i) => {
        // Settle to a gentle idle wave
        const idleHeight = 0.08 + Math.sin((i / barCount) * Math.PI) * 0.06;
        Animated.timing(bar, {
          toValue: idleHeight,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();
      });
    }
    return () => loopRefs.current.forEach(l => l.stop());
  }, [isActive]);

  const barWidth = Math.max(3, Math.floor((220 / barCount) * 0.52));

  // UPGRADE 5: glowAnim drives shadowOpacity on the container (0.1 → 0.5)
  const containerShadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.5],
  });

  return (
    <Animated.View
      style={[
        s.container,
        {
          height,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: containerShadowOpacity,
          shadowRadius: 18,
        },
      ]}
    >
      {bars.map((bar, i) => {
        // Center bars are taller (natural wave shape)
        const centerBoost = 1 + Math.sin((i / (barCount - 1)) * Math.PI) * 0.25;
        return (
          <Animated.View
            key={i}
            style={[
              s.bar,
              {
                backgroundColor: isActive ? color : inactiveColor,
                opacity: bar.interpolate({
                  inputRange: [0, 1],
                  outputRange: isActive ? [0.35, 1] : [0.4, 0.4],
                }),
                height: bar.interpolate({
                  inputRange: [0, 1],
                  outputRange: [3, height * centerBoost],
                }),
                width: barWidth,
                borderRadius: barWidth / 2,
                shadowColor: isActive ? color : 'transparent',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: isActive ? 0.75 : 0,
                shadowRadius: 5,
              },
            ]}
          />
        );
      })}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2.5,
  },
  bar: {
    borderRadius: 4,
  },
});
