import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface Props {
  isActive: boolean;
  color?: string;
  barCount?: number;
  height?: number;
}

export function AudioWaveform({ isActive, color = '#6366f1', barCount = 18, height = 40 }: Props) {
  const bars = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.15))
  ).current;
  const loopRefs = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    loopRefs.current.forEach(l => l.stop());
    loopRefs.current = [];

    if (isActive) {
      bars.forEach((bar, i) => {
        const minH = 0.08 + Math.random() * 0.1;
        const maxH = 0.4 + Math.random() * 0.55;
        const dur = 280 + Math.random() * 340;
        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(bar, {
              toValue: maxH, duration: dur,
              delay: i * 18, useNativeDriver: false,
            }),
            Animated.timing(bar, {
              toValue: minH, duration: dur * 0.8,
              useNativeDriver: false,
            }),
          ])
        );
        loopRefs.current.push(loop);
        loop.start();
      });
    } else {
      bars.forEach(bar => {
        Animated.timing(bar, {
          toValue: 0.12, duration: 300, useNativeDriver: false,
        }).start();
      });
    }
    return () => loopRefs.current.forEach(l => l.stop());
  }, [isActive]);

  return (
    <View style={[s.container, { height }]}>
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={[
            s.bar,
            {
              backgroundColor: color,
              opacity: isActive ? bar.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) : 0.2,
              height: bar.interpolate({ inputRange: [0, 1], outputRange: [3, height] }),
              width: Math.floor((170 / barCount) * 0.55),
            },
          ]}
        />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  bar: {
    borderRadius: 3,
  },
});
