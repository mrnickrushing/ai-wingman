import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';

type TranscriptLine = {
  raw: string;
  timestamp: string | null;
  speaker: string | null;
  body: string;
};

function parseTranscript(text: string): TranscriptLine[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const lines = trimmed.includes('\n')
    ? trimmed.split('\n')
    : trimmed.match(/[^.!?\n]+[.!?\n]*/g) ?? [trimmed];
  return lines.map((line) => {
    const compact = line.trim();
    const match = compact.match(/^\[(\d{2}:\d{2}(?::\d{2})?)\]\s*(?:(You|Wingman|Coach):\s*)?(.*)$/i);
    if (match) {
      const [, timestamp, speaker, body] = match;
      return {
        raw: compact,
        timestamp,
        speaker: speaker ?? null,
        body: body.trim(),
      };
    }
    return {
      raw: compact,
      timestamp: null,
      speaker: null,
      body: compact,
    };
  }).filter((line) => Boolean(line.body));
}

function highlight(text: string, term: string) {
  if (!term) return text;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(term);
  if (idx < 0) return text;
  const end = idx + term.length;
  return (
    <>
      {text.slice(0, idx)}
      <Text style={s.highlight}>{text.slice(idx, end)}</Text>
      {text.slice(end)}
    </>
  );
}

type Props = {
  title: string;
  transcriptText: string;
  onBookmark: (excerpt: string) => void;
  onShare?: (excerpt: string) => void;
};

export function SessionTranscriptExplorer({ title, transcriptText, onBookmark, onShare }: Props) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const segments = useMemo(() => parseTranscript(transcriptText), [transcriptText]);
  const query = search.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!query) return segments;
    return segments.filter((segment) => `${segment.body} ${segment.speaker ?? ''} ${segment.timestamp ?? ''}`.toLowerCase().includes(query));
  }, [query, segments]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, transcriptText]);

  const selectedExcerpt = matches[selectedIndex] ?? matches[0] ?? segments[0] ?? null;
  const hasMatches = matches.length > 0;
  const matchedCount = query ? matches.length : segments.length;
  const previewText = selectedExcerpt?.body || 'No transcript text captured for this session.';

  return (
    <View style={s.card}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Transcript explorer</Text>
          <Text style={s.title}>{title}</Text>
        </View>
        <Text style={s.count}>{query ? `${Math.min(selectedIndex + 1, matchedCount)}/${matchedCount}` : `${matchedCount} lines`}</Text>
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search transcript..."
        placeholderTextColor="#64748b"
        autoCapitalize="none"
        autoCorrect={false}
        style={s.input}
      />

      <View style={s.controls}>
        <Pressable
          onPress={() => setSelectedIndex((current) => Math.max(0, current - 1))}
          style={[s.controlBtn, !hasMatches && s.controlBtnDisabled]}
          disabled={!hasMatches}
        >
          <Text style={s.controlText}>Prev</Text>
        </Pressable>
        <Pressable
          onPress={() => setSelectedIndex((current) => Math.min(Math.max(0, matchedCount - 1), current + 1))}
          style={[s.controlBtn, !hasMatches && s.controlBtnDisabled]}
          disabled={!hasMatches}
        >
          <Text style={s.controlText}>Next</Text>
        </Pressable>
        <Pressable
          onPress={() => onBookmark(selectedExcerpt?.raw || transcriptText || 'No transcript available.')}
          style={s.controlBtn}
        >
          <Text style={s.controlText}>Bookmark</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            const text = selectedExcerpt?.raw || transcriptText || 'No transcript available.';
            if (onShare) {
              onShare(text);
              return;
            }
            void Share.share({ message: text }).catch(() => {});
          }}
          style={s.controlBtn}
        >
          <Text style={s.controlText}>Share</Text>
        </Pressable>
      </View>

      <View style={s.excerptCard}>
        <Text style={s.excerptLabel}>
          {query ? (hasMatches ? 'Current match' : 'No matches') : 'Transcript preview'}
        </Text>
        <Text style={s.excerptText}>
          {selectedExcerpt ? (
            <>
              {selectedExcerpt.timestamp ? <Text style={s.excerptTimestamp}>[{selectedExcerpt.timestamp}] </Text> : null}
              {selectedExcerpt.speaker ? <Text style={s.excerptSpeaker}>{selectedExcerpt.speaker}: </Text> : null}
              {highlight(selectedExcerpt.body, query)}
            </>
          ) : (
            previewText
          )}
        </Text>
      </View>

      {segments.length > 0 ? (
        <View style={s.matchList}>
          {(query ? matches : segments).slice(0, 8).map((segment, index) => (
            <Pressable
              key={`${index}-${segment.raw.slice(0, 20)}`}
              onPress={() => setSelectedIndex(index)}
              style={[s.matchItem, index === selectedIndex && s.matchItemActive]}
            >
              <View style={s.matchIndexWrap}>
                <Text style={s.matchIndex}>{segment.timestamp ?? `L${index + 1}`}</Text>
                {segment.speaker ? <Text style={s.matchSpeaker}>{segment.speaker}</Text> : null}
              </View>
              <Text style={s.matchText} numberOfLines={3}>{highlight(segment.body, query)}</Text>
              <Pressable
                onPress={() => onBookmark(segment.raw)}
                style={s.matchBookmark}
              >
                <Text style={s.matchBookmarkText}>Save</Text>
              </Pressable>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 8,
    padding: 14,
    gap: 10,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  label: { color: '#64748b', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { color: '#f8fafc', fontSize: 15, fontWeight: '900', marginTop: 2 },
  count: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 13,
  },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  controlBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  controlBtnDisabled: { opacity: 0.45 },
  controlText: { color: '#e2e8f0', fontSize: 11, fontWeight: '800' },
  excerptCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    padding: 12,
    gap: 5,
  },
  excerptLabel: { color: '#818cf8', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 },
  excerptText: { color: '#cbd5e1', fontSize: 13, lineHeight: 19 },
  excerptTimestamp: { color: '#818cf8', fontWeight: '900' },
  excerptSpeaker: { color: '#f8fafc', fontWeight: '800' },
  highlight: { color: '#f8fafc', backgroundColor: 'rgba(129,140,248,0.25)' },
  matchList: { gap: 8 },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.025)',
    padding: 10,
  },
  matchItemActive: {
    borderColor: 'rgba(129,140,248,0.35)',
    backgroundColor: 'rgba(129,140,248,0.12)',
  },
  matchIndexWrap: {
    minWidth: 64,
    gap: 2,
  },
  matchIndex: {
    color: '#818cf8',
    fontSize: 11,
    fontWeight: '900',
  },
  matchSpeaker: { color: '#94a3b8', fontSize: 10, fontWeight: '800' },
  matchText: { flex: 1, color: '#cbd5e1', fontSize: 12, lineHeight: 17 },
  matchBookmark: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.24)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(129,140,248,0.08)',
  },
  matchBookmarkText: { color: '#c7d2fe', fontSize: 10, fontWeight: '900' },
});
