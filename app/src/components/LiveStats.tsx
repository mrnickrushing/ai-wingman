import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Animated, Easing } from 'react-native';

export interface LiveStatChip {
  icon: string;
  value: string;
  label: string;
  color?: string;
  active?: boolean;
}

interface Props {
  chips: LiveStatChip[];
}

// UPGRADE 12: radial glow behind active chip icon
function IconGlow({ color }: { color: string }) {
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: 900,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        s.iconGlow,
        {
          backgroundColor: color,
          opacity: glowAnim,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 8,
        },
      ]}
    />
  );
}

function Chip({ chip, delay }: { chip: LiveStatChip; delay: number }) {
  const entryAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(entryAnim, {
      toValue: 1,
      duration: 380,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (chip.active) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [chip.active]);

  const activeColor = chip.color ?? '#6366f1';

  return (
    <Animated.View
      style={[
        s.chip,
        chip.active && {
          backgroundColor: activeColor + '18',
          borderColor: activeColor + '50',
          shadowColor: activeColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 4,
        },
        {
          opacity: entryAnim,
          transform: [
            { scale: pulseAnim },
            { translateY: entryAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
          ],
        },
      ]}
    >
      {chip.active && (
        <View style={s.activeDot} >
          <View style={[s.activeDotInner, { backgroundColor: activeColor, shadowColor: activeColor }]} />
        </View>
      )}
      {/* UPGRADE 12: color-matched glow behind icon when active */}
      <View style={s.iconWrap}>
        {chip.active && <IconGlow color={activeColor} />}
        <Text style={s.icon}>{chip.icon}</Text>
      </View>
      <Text style={[s.value, chip.color ? { color: chip.color } : null]} numberOfLines={1}>
        {chip.value}
      </Text>
      <Text style={s.label} numberOfLines={1}>{chip.label}</Text>
    </Animated.View>
  );
}

export function LiveStats({ chips }: Props) {
  return (
    <View style={s.row}>
      {chips.map((chip, i) => (
        <Chip key={i} chip={chip} delay={i * 60} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  chip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  // Renamed to avoid conflict
  activeDot: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 6,
    height: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  // UPGRADE 12: icon wrapper with relative positioning for glow
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconGlow: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  icon: { fontSize: 14 },
  value: { color: '#f1f5f9', fontSize: 17, fontWeight: '900', letterSpacing: -0.5 },
  label: { color: '#3d3d5c', fontSize: 9, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
});
