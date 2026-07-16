import React, { useRef, useEffect } from 'react';
import { FlatList, Text, StyleSheet, View, Animated, Platform } from 'react-native';
import { TranscriptEntry } from '../types';

interface Props {
  entries: TranscriptEntry[];
  searchTerm?: string;
}

export function TranscriptView({ entries, searchTerm = '' }: Props) {
  const listRef = useRef<FlatList<TranscriptEntry>>(null);
  const normalizedSearch = searchTerm.trim().toLowerCase();

  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [entries.length]);

  return (
    <FlatList
      ref={listRef}
      data={entries}
      keyExtractor={(entry) => entry.id}
      style={s.list}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
      initialNumToRender={16}
      maxToRenderPerBatch={12}
      updateCellsBatchingPeriod={50}
      windowSize={7}
      removeClippedSubviews={Platform.OS !== 'web'}
      onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      ListEmptyComponent={(
        <View style={s.empty} accessibilityLiveRegion="polite">
          <View style={s.emptyDots} importantForAccessibility="no-hide-descendants">
            {[0, 1, 2].map(i => <PulseDot key={i} delay={i * 200} />)}
          </View>
          <Text style={s.emptyText}>Listening…</Text>
        </View>
      )}
      renderItem={({ item: entry }) => (
        <View
          style={[s.line, !entry.isFinal && s.lineInterim]}
          accessible
          accessibilityLabel={`${entry.isFinal ? 'Transcript' : 'Live transcript'}: ${entry.text}`}
        >
          <View style={[s.speaker, entry.isFinal ? s.speakerFinal : s.speakerInterim]} />
          <Text style={[s.lineText, !entry.isFinal && s.lineTextInterim]}>
            {renderText(entry.text, normalizedSearch)}
          </Text>
        </View>
      )}
    />
  );
}

function renderText(text: string, searchTerm: string) {
  if (!searchTerm) return text;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(searchTerm);
  if (idx < 0) return text;
  const end = idx + searchTerm.length;
  return (
    <>
      {text.slice(0, idx)}
      <Text style={s.highlight}>{text.slice(idx, end)}</Text>
      {text.slice(end)}
    </>
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
  list: { height: 220, flexGrow: 0 },
  content: {
    flexGrow: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24, gap: 8,
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
  highlight: {
    color: '#f8fafc',
    backgroundColor: 'rgba(129,140,248,0.25)',
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
