/**
 * PulsingIcon — UPGRADE 11
 * A reusable component that wraps any emoji/icon string with a continuous
 * pulse animation. Use in ModeCard icons, action buttons, or anywhere
 * emoji icons should softly "breathe" to draw the eye.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, Easing, ViewStyle } from 'react-native';

export interface PulsingIconProps {
  icon: string;
  color?: string;
  size?: number;
  intensity?: 'soft' | 'medium' | 'strong';
  style?: ViewStyle;
}

const INTENSITY_CONFIG = {
  soft:   { toScale: 1.06, duration: 1300 },
  medium: { toScale: 1.14, duration: 1000 },
  strong: { toScale: 1.24, duration: 750 },
};

export function PulsingIcon({
  icon,
  color,
  size = 22,
  intensity = 'soft',
  style,
}: PulsingIconProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const { toScale, duration } = INTENSITY_CONFIG[intensity];

    const scaleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: toScale,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    // Subtle opacity pulse for "strong" intensity
    const opacityLoop = intensity === 'strong'
      ? Animated.loop(
          Animated.sequence([
            Animated.timing(opacityAnim, {
              toValue: 0.75,
              duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 1,
              duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        )
      : null;

    scaleLoop.start();
    opacityLoop?.start();

    return () => {
      scaleLoop.stop();
      opacityLoop?.stop();
    };
  }, [intensity]);

  return (
    <Animated.View
      style={[
        styles.wrapper,
        style,
        { transform: [{ scale: pulseAnim }], opacity: opacityAnim },
      ]}
    >
      <Text style={[styles.icon, { fontSize: size, color: color ?? undefined }]}>
        {icon}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    textAlign: 'center',
  },
});
