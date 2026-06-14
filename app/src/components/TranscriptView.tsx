import React, { useRef, useEffect } from 'react';
import { ScrollView, Text, StyleSheet, View, Animated } from 'react-native';
import { TranscriptEntry } from '../types';

interface Props {
  entries: TranscriptEntry[];
}

export function TranscriptView({ entries }: Props) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [entries.length]);

  if (entries.length === 0) {
    return (
      <View style={s.empty}>
        <View style={s.emptyDots}>
          {[0, 1, 2].map(i => <PulseDot key={i} delay={i * 200} />)}
        </View>
        <Text style={s.emptyText}>Listening…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={s.scroll}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      {entries.map((entry, i) => (
        <View key={entry.id} style={[s.line, !entry.isFinal && s.lineInterim]}>
          <View style={[s.speaker, entry.isFinal ? s.speakerFinal : s.speakerInterim]} />
          <Text style={[s.lineText, !entry.isFinal && s.lineTextInterim]}>
            {entry.text}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

function PulseDot({ delay }: { delay: number }) {
  const scale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.6, duration: 500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View style={[s.dot, { transform: [{ scale }] }]} />
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24, gap: 8,
  },
  line: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
  },
  lineInterim: { opacity: 0.5 },
  speaker: {
    width: 3, marginTop: 5, borderRadius: 2,
    minHeight: 16, alignSelf: 'stretch',
  },
  speakerFinal: { backgroundColor: '#6366f1' },
  speakerInterim: { backgroundColor: '#334155' },
  lineText: {
    flex: 1, color: '#cbd5e1', fontSize: 14, lineHeight: 22,
  },
  lineTextInterim: {
    color: '#475569', fontStyle: 'italic',
  },
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14,
  },
  emptyDots: { flexDirection: 'row', gap: 8 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(99,102,241,0.4)',
  },
  emptyText: {
    color: '#334155', fontSize: 13, fontWeight: '500', letterSpacing: 1.5,
  },
});
