import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Animated, Dimensions,
  NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { requestRecordingPermissionsAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface Slide {
  emoji: string;
  title: string;
  body: string;
  gradient: readonly [string, string];
  orbColor: string;
}

const SLIDES: Slide[] = [
  {
    emoji: '🎧',
    title: 'Your AI in your ear',
    body: 'AI Wingman listens to your conversation and whispers live coaching through your AirPods. Completely invisible. Insanely effective.',
    gradient: ['#0c0c22', '#050510'],
    orbColor: 'rgba(99,102,241,0.14)',
  },
  {
    emoji: '⚔️',
    title: 'Choose your battlefield',
    body: 'Dates. Sales calls. Pitches. Hard conversations. Pick a mode and Wingman tailors every suggestion to the moment.',
    gradient: ['#0d0a1a', '#050510'],
    orbColor: 'rgba(236,72,153,0.12)',
  },
  {
    emoji: '🤫',
    title: 'Go invisible',
    body: "Put your phone in your pocket. Wear your AirPods. Let Wingman do the work. Nobody knows it's there.",
    gradient: ['#050c14', '#050510'],
    orbColor: 'rgba(34,211,238,0.09)',
  },
];

interface Props {
  onComplete: () => void;
}

export function OnboardingScreen({ onComplete }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const dotAnims = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;

  const animateDots = (active: number) => {
    dotAnims.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: i === active ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }).start();
    });
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (next !== index) {
      setIndex(next);
      animateDots(next);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  const goToSlide = (i: number) => {
    scrollRef.current?.scrollTo({ x: i * SCREEN_WIDTH, animated: true });
  };

  const handleStart = async () => {
    try {
      await requestRecordingPermissionsAsync();
    } catch {
      // ignore — proceed regardless of permission outcome
    }
    onComplete();
  };

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {SLIDES.map((slide, i) => (
            <View key={i} style={s.slide}>
              <LinearGradient colors={slide.gradient} style={StyleSheet.absoluteFill} />
              <View style={[s.orb, { backgroundColor: slide.orbColor }]} />

              <View style={s.content}>
                <Text style={s.emoji}>{slide.emoji}</Text>
                <Text style={s.title}>{slide.title}</Text>
                <Text style={s.body}>{slide.body}</Text>

                {i === 1 && (
                  <View style={s.chipRow}>
                    <View style={[s.chip, s.chipSales]}>
                      <Text style={[s.chipText, s.chipTextSales]}>💼 Sales</Text>
                    </View>
                    <View style={[s.chip, s.chipDating]}>
                      <Text style={[s.chipText, s.chipTextDating]}>💘 Dating</Text>
                    </View>
                    <View style={[s.chip, s.chipHard]}>
                      <Text style={[s.chipText, s.chipTextHard]}>🔥 Hard Convos</Text>
                    </View>
                  </View>
                )}

                {i === 2 && (
                  <View style={s.stepsRow}>
                    <Text style={s.stepText}>📱 Pocket</Text>
                    <Text style={s.stepArrow}>→</Text>
                    <Text style={s.stepText}>🎧 AirPods</Text>
                    <Text style={s.stepArrow}>→</Text>
                    <Text style={s.stepText}>🚀 Crush it</Text>
                  </View>
                )}
              </View>

              {/* Bottom fade to ensure content reads over gradient */}
              <LinearGradient
                colors={['transparent', 'rgba(5,5,16,0.85)']}
                style={s.bottomFade}
                pointerEvents="none"
              />

              {i < 2 && (
                <TouchableOpacity style={s.skip} onPress={() => goToSlide(2)} activeOpacity={0.7}>
                  <Text style={s.skipText}>Skip →</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>

        <View style={s.bottom}>
          <View style={s.dots}>
            {SLIDES.map((_, i) => (
              <Animated.View
                key={i}
                style={[
                  s.dot,
                  {
                    width: dotAnims[i].interpolate({ inputRange: [0, 1], outputRange: [6, 22] }),
                    backgroundColor: dotAnims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: ['rgba(255,255,255,0.2)', '#6366f1'],
                    }),
                  },
                ]}
              />
            ))}
          </View>

          {index === 2 && (
            <TouchableOpacity onPress={handleStart} style={s.ctaWrap} activeOpacity={0.82}>
              <LinearGradient
                colors={['#6366f1', '#8b5cf6', '#ec4899']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.ctaGrad}
              >
                <Text style={s.ctaText}>Allow Microphone &amp; Start</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050510' },
  safe: { flex: 1 },

  slide: { width: SCREEN_WIDTH, flex: 1 },
  orb: {
    position: 'absolute', top: -200, alignSelf: 'center',
    width: 500, height: 500, borderRadius: 250,
  },
  bottomFade: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 220,
  },
  content: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32, gap: 18,
  },
  emoji: {
    fontSize: 96,
    textShadowColor: 'rgba(255,255,255,0.25)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  title: {
    fontSize: 34, fontWeight: '900', color: '#f1f5f9',
    letterSpacing: -1.5, textAlign: 'center',
  },
  body: { fontSize: 16, color: '#94a3b8', lineHeight: 25, textAlign: 'center' },

  chipRow: {
    flexDirection: 'row', gap: 10, flexWrap: 'wrap',
    justifyContent: 'center', marginTop: 24,
  },
  chip: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1,
  },
  chipSales: { backgroundColor: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.6)' },
  chipDating: { backgroundColor: 'rgba(236,72,153,0.15)', borderColor: 'rgba(236,72,153,0.6)' },
  chipHard: { backgroundColor: 'rgba(139,92,246,0.15)', borderColor: 'rgba(139,92,246,0.6)' },
  chipText: { fontSize: 13, fontWeight: '700' },
  chipTextSales: { color: '#818cf8' },
  chipTextDating: { color: '#f472b6' },
  chipTextHard: { color: '#a78bfa' },

  stepsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    flexWrap: 'wrap', justifyContent: 'center', marginTop: 24,
  },
  stepText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
  stepArrow: { color: '#475569', fontSize: 14 },

  skip: { position: 'absolute', top: 12, right: 22 },
  skipText: { color: '#64748b', fontSize: 13, fontWeight: '600' },

  bottom: { paddingBottom: 48, paddingHorizontal: 24, gap: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  dot: { height: 6, borderRadius: 3 },

  ctaWrap: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 22,
    elevation: 14,
  },
  ctaGrad: { paddingVertical: 18, alignItems: 'center' },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
