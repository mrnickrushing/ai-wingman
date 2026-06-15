import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface Props {
  isActive: boolean;
  color?: string;
  barCount?: number;
  height?: number;
}

export function AudioWaveform({ isActive, color = '#6366f1', barCount = 24, height = 56 }: Props) {
  const bars = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.15))
  ).current;
  const loopRefs = useRef<Animated.CompositeAnimation[]>([]);

  useEffect(() => {
    loopRefs.current.forEach(l => l.stop());
    loopRefs.current = [];

    if (isActive) {
      bars.forEach((bar, i) => {
        const minH = 0.06 + Math.random() * 0.08;
        const maxH = 0.45 + Math.random() * 0.55;
        const dur = 220 + Math.random() * 360;
        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(bar, {
              toValue: maxH,
              duration: dur,
              delay: i * 14,
              useNativeDriver: false,
            }),
            Animated.timing(bar, {
              toValue: minH,
              duration: dur * 0.75,
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
          toValue: 0.10,
          duration: 400,
          useNativeDriver: false,
        }).start();
      });
    }
    return () => loopRefs.current.forEach(l => l.stop());
  }, [isActive]);

  const barWidth = Math.max(3, Math.floor((200 / barCount) * 0.5));

  return (
    <View style={[s.container, { height }]}>
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={[
            s.bar,
            {
              backgroundColor: color,
              opacity: isActive
                ? bar.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] })
                : 0.18,
              height: bar.interpolate({ inputRange: [0, 1], outputRange: [3, height] }),
              width: barWidth,
              shadowColor: isActive ? color : 'transparent',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: isActive ? 0.6 : 0,
              shadowRadius: 4,
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
    gap: 2,
  },
  bar: {
    borderRadius: 3,
  },
});
