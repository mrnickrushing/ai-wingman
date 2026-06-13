import React, { useRef, useEffect } from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
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
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Listening…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {entries.map((entry) => (
        <Text
          key={entry.id}
          style={[styles.line, !entry.isFinal && styles.interim]}
        >
          {entry.text}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 6,
  },
  line: {
    color: '#C0C0DA',
    fontSize: 14,
    lineHeight: 22,
  },
  interim: {
    color: '#666680',
    fontStyle: 'italic',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#44445A',
    fontSize: 14,
    letterSpacing: 2,
  },
});
