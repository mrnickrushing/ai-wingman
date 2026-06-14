import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Animated, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { listSessions, SavedSession } from '../services/sessionService';

const MODE_META: Record<string, { emoji: string; label: string; accent: string }> = {
  sales:              { emoji: '💼', label: 'Sales Call',        accent: '#6366f1' },
  dating:             { emoji: '💘', label: 'Date',              accent: '#ec4899' },
  networking:         { emoji: '🤝', label: 'Networking',        accent: '#22d3ee' },
  pitching:           { emoji: '🚀', label: 'Pitch',             accent: '#f59e0b' },
  hard_conversations: { emoji: '🔥', label: 'Hard Conversation', accent: '#8b5cf6' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

interface Props {
  onBack: () => void;
}

export function HistoryScreen({ onBack }: Props) {
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    listSessions().then((data) => {
      setSessions(data);
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    });
  }, []);

  // Group sessions by date label
  const grouped = sessions.reduce<Array<{ label: string; items: SavedSession[] }>>((acc, s) => {
    const label = formatDate(s.createdAt);
    const last = acc[acc.length - 1];
    if (last && last.label === label) {
      last.items.push(s);
    } else {
      acc.push({ label, items: [s] });
    }
    return acc;
  }, []);

  return (
    <View style={st.root}>
      <LinearGradient colors={['#0c0c22', '#050510']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={st.safe}>
        <View style={st.header}>
          <TouchableOpacity onPress={onBack} style={st.backBtn} hitSlop={10}>
            <Text style={st.backText}>←</Text>
          </TouchableOpacity>
          <Text style={st.title}>Session History</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={st.loadingWrapper}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={st.loadingText}>Loading sessions...</Text>
          </View>
        ) : sessions.length === 0 ? (
          <Animated.View style={[st.empty, { opacity: fadeAnim }]}>
            <Text style={st.emptyEmoji}>📭</Text>
            <Text style={st.emptyTitle}>No sessions yet</Text>
            <Text style={st.emptyBody}>
              Your completed sessions will appear here. Start a session to build your history.
            </Text>
          </Animated.View>
        ) : (
          <Animated.ScrollView
            style={{ opacity: fadeAnim }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={st.list}
          >
            {grouped.map((group) => (
              <View key={group.label}>
                <Text style={st.groupLabel}>{group.label}</Text>
                {group.items.map((session) => {
                  const meta = MODE_META[session.mode] ?? { emoji: '🎯', label: session.mode, accent: '#6366f1' };
                  const isOpen = expanded === session.id;
                  return (
                    <TouchableOpacity
                      key={session.id}
                      onPress={() => setExpanded(isOpen ? null : session.id)}
                      activeOpacity={0.8}
                      style={st.card}
                    >
                      <LinearGradient
                        colors={[`${meta.accent}18`, `${meta.accent}06`]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={[st.cardInner, { borderLeftColor: meta.accent }]}
                      >
                        <View style={st.cardRow}>
                          <Text style={st.cardEmoji}>{meta.emoji}</Text>
                          <View style={st.cardMid}>
                            <Text style={st.cardTitle} numberOfLines={1}>{session.title || meta.label}</Text>
                            <Text style={st.cardSub}>
                              {formatDuration(session.durationSeconds)} · {session.coachingCount} tips · score {session.score}
                            </Text>
                          </View>
                          <Text style={[st.cardArrow, { color: meta.accent }]}>
                            {isOpen ? '↑' : '↓'}
                          </Text>
                        </View>

                        {isOpen && session.analysis && (
                          <View style={st.analysis}>
                            <Text style={st.analysisSummary}>{session.analysis.summary}</Text>
                            {session.analysis.strengths.length > 0 && (
                              <View style={st.analysisSection}>
                                <Text style={[st.analysisSectionLabel, { color: meta.accent }]}>✓ Strengths</Text>
                                {session.analysis.strengths.map((s2, i) => (
                                  <Text key={i} style={st.analysisItem}>�� {s2}</Text>
                                ))}
                              </View>
                            )}
                            {session.analysis.improvements.length > 0 && (
                              <View style={st.analysisSection}>
                                <Text style={[st.analysisSectionLabel, { color: meta.accent }]}>↑ Improvements</Text>
                                {session.analysis.improvements.map((s2, i) => (
                                  <Text key={i} style={st.analysisItem}>· {s2}</Text>
                                ))}
                              </View>
                            )}
                            {session.analysis.keyMoment ? (
                              <Text style={st.analysisKeyMoment}>Key moment: {session.analysis.keyMoment}</Text>
                            ) : null}
                          </View>
                        )}

                        {isOpen && !session.analysis && (
                          <View style={st.analysis}>
                            <Text style={st.analysisSummary}>No analysis available for this session.</Text>
                          </View>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </Animated.ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050510' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  backText: { color: '#94a3b8', fontSize: 20, fontWeight: '700' },
  title: { color: '#f1f5f9', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },

  loadingWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { color: '#475569', fontSize: 14 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { color: '#f1f5f9', fontSize: 20, fontWeight: '800' },
  emptyBody: { color: '#475569', fontSize: 14, lineHeight: 21, textAlign: 'center' },

  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 6 },
  groupLabel: {
    color: '#334155', fontSize: 10, fontWeight: '700', letterSpacing: 2,
    marginTop: 18, marginBottom: 8, paddingLeft: 4,
  },

  card: { borderRadius: 14, overflow: 'hidden', marginBottom: 2 },
  cardInner: {
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.055)', borderLeftWidth: 3,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardEmoji: { fontSize: 24 },
  cardMid: { flex: 1, gap: 3 },
  cardTitle: { color: '#f1f5f9', fontSize: 15, fontWeight: '700' },
  cardSub: { color: '#475569', fontSize: 12 },
  cardArrow: { fontSize: 16, fontWeight: '800' },

  analysis: { marginTop: 14, gap: 10 },
  analysisSummary: { color: '#cbd5e1', fontSize: 14, lineHeight: 20 },
  analysisSection: { gap: 3 },
  analysisSectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  analysisItem: { color: '#94a3b8', fontSize: 13, lineHeight: 19 },
  analysisKeyMoment: { color: '#64748b', fontSize: 12, fontStyle: 'italic' },
});
