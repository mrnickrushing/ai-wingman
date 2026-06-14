import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Share,
  SafeAreaView, ScrollView, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { listSessions, SavedSession } from '../services/sessionService';
import { ConversationMode } from '../types';

const MODE_META: Record<string, { icon: string; label: string; accent: string }> = {
  sales: { icon: 'S', label: 'Sales', accent: '#6366f1' },
  dating: { icon: 'D', label: 'Dating', accent: '#ec4899' },
  networking: { icon: 'N', label: 'Networking', accent: '#22d3ee' },
  pitching: { icon: 'P', label: 'Pitching', accent: '#f59e0b' },
  hard_conversations: { icon: 'H', label: 'Hard Talk', accent: '#8b5cf6' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`;
}

interface Props {
  onBack: () => void;
  onStartMode: (mode: ConversationMode) => void;
}

export function HistoryScreen({ onBack, onStartMode }: Props) {
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    listSessions().then((data) => {
      setSessions(data);
      setLoading(false);
    });
  }, []);

  const dashboard = useMemo(() => {
    const total = sessions.length;
    const avgScore = total
      ? Math.round(sessions.reduce((sum, s) => sum + s.score, 0) / total)
      : 0;
    const totalTips = sessions.reduce((sum, s) => sum + s.coachingCount, 0);
    const best = sessions.reduce<SavedSession | null>((current, s) => (
      !current || s.score > current.score ? s : current
    ), null);
    const modes = sessions.reduce<Record<string, number>>((acc, s) => {
      acc[s.mode] = (acc[s.mode] ?? 0) + 1;
      return acc;
    }, {});
    const topMode = Object.entries(modes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const improvement = sessions[0] && sessions[sessions.length - 1]
      ? sessions[0].score - sessions[sessions.length - 1].score
      : 0;
    return { total, avgScore, totalTips, best, topMode, improvement };
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((session) => {
      const haystack = [
        session.title,
        session.mode,
        session.analysis?.summary,
        session.analysis?.keyMoment,
        session.analysis?.strengths.join(' '),
        session.analysis?.improvements.join(' '),
        session.analysis?.followUps.map((item) => item.text).join(' '),
        session.transcriptText,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [search, sessions]);

  const grouped = filteredSessions.reduce<Array<{ label: string; items: SavedSession[] }>>((acc, session) => {
    const label = formatDate(session.createdAt);
    const last = acc[acc.length - 1];
    if (last?.label === label) last.items.push(session);
    else acc.push({ label, items: [session] });
    return acc;
  }, []);

  const latestSession = filteredSessions[0] ?? sessions[0] ?? null;

  const buildShareText = (session: SavedSession): string => {
    const parts = [
      `${session.title || MODE_META[session.mode]?.label || 'Session'} · ${session.score}`,
      `Duration: ${formatDuration(session.durationSeconds)} · Tips: ${session.coachingCount}`,
      session.analysis?.summary,
      session.analysis?.strengths?.length ? `What worked: ${session.analysis.strengths.join('; ')}` : null,
      session.analysis?.improvements?.length ? `Next time: ${session.analysis.improvements.join('; ')}` : null,
      session.analysis?.followUps?.length ? `Follow-up: ${session.analysis.followUps[0].text}` : null,
      session.transcriptText ? `Transcript: ${session.transcriptText.slice(0, 1200)}` : null,
    ].filter(Boolean);
    return parts.join('\n\n');
  };

  const shareSession = async (session: SavedSession) => {
    await Share.share({ message: buildShareText(session) }).catch(() => {});
  };

  const transcriptQuery = search.trim().toLowerCase();
  const buildTranscriptExcerpt = (session: SavedSession) => {
    const raw = session.transcriptText.trim();
    if (!raw) return 'No transcript text captured for this session.';
    const segments = raw.match(/[^.!?]+[.!?]*/g) ?? [raw];
    if (!transcriptQuery) {
      return segments.slice(0, 2).join(' ').slice(0, 240);
    }
    const hit = segments.find((segment) => segment.toLowerCase().includes(transcriptQuery));
    return (hit ?? segments.slice(0, 2).join(' ')).slice(0, 260);
  };

  const renderHighlighted = (text: string) => {
    if (!transcriptQuery) return text;
    const lower = text.toLowerCase();
    const idx = lower.indexOf(transcriptQuery);
    if (idx < 0) return text;
    const end = idx + transcriptQuery.length;
    return (
      <>
        {text.slice(0, idx)}
        <Text style={st.searchHighlight}>{text.slice(idx, end)}</Text>
        {text.slice(end)}
      </>
    );
  };

  return (
    <View style={st.root}>
      <LinearGradient colors={['#090914', '#050510']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={st.safe}>
        <View style={st.header}>
          <TouchableOpacity onPress={onBack} style={st.backBtn} hitSlop={10}>
            <Text style={st.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={st.title}>Coaching History</Text>
          <View style={st.headerSpacer} />
        </View>

        {loading ? (
          <View style={st.loadingWrapper}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={st.loadingText}>Loading sessions...</Text>
          </View>
        ) : sessions.length === 0 ? (
          <View style={st.empty}>
            <Text style={st.emptyTitle}>No sessions yet</Text>
            <Text style={st.emptyBody}>Complete a live session or practice run to start tracking your improvement.</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.list}>
            <View style={st.searchCard}>
              <Text style={st.searchLabel}>Search history</Text>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search sessions, transcript, advice..."
                placeholderTextColor="#475569"
                style={st.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              <Text style={st.searchHint}>
                {search.trim()
                  ? `${filteredSessions.length} matching session${filteredSessions.length === 1 ? '' : 's'}`
                  : 'Search titles, analysis, follow-ups, and transcript text.'}
              </Text>
            </View>

            <View style={st.dashboard}>
              <Text style={st.dashboardTitle}>Progress dashboard</Text>
              <View style={st.metricRow}>
                <Metric label="Sessions" value={dashboard.total.toString()} />
                <Metric label="Avg score" value={dashboard.avgScore.toString()} />
                <Metric label="Tips" value={dashboard.totalTips.toString()} />
              </View>
              {latestSession ? (
                <View style={st.quickActions}>
                  <TouchableOpacity
                    onPress={() => onStartMode(latestSession.mode as ConversationMode)}
                    style={st.quickPrimary}
                    activeOpacity={0.82}
                  >
                    <Text style={st.quickPrimaryText}>Run again</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => shareSession(latestSession)}
                    style={st.quickSecondary}
                    activeOpacity={0.82}
                  >
                    <Text style={st.quickSecondaryText}>Share last recap</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              <View style={st.insightCard}>
                <Text style={st.insightLabel}>Current focus</Text>
                <Text style={st.insightText}>
                  {dashboard.best
                    ? `Best result: ${dashboard.best.title || 'Session'} scored ${dashboard.best.score}. ${
                        dashboard.improvement > 0
                          ? `You are up ${dashboard.improvement} points from your oldest saved session.`
                          : 'Run two more sessions to see trend data.'
                      }`
                    : 'Run your first session to unlock coaching trends.'}
                </Text>
              </View>
              {dashboard.topMode ? (
                <View style={st.insightCard}>
                  <Text style={st.insightLabel}>Most practiced</Text>
                  <Text style={st.insightText}>{MODE_META[dashboard.topMode]?.label ?? dashboard.topMode}</Text>
                </View>
              ) : null}
            </View>

            {grouped.map((group) => (
              <View key={group.label}>
                <Text style={st.groupLabel}>{group.label}</Text>
                {group.items.map((session) => {
                  const meta = MODE_META[session.mode] ?? { icon: 'W', label: session.mode, accent: '#6366f1' };
                  const isOpen = expanded === session.id;
                  return (
                    <TouchableOpacity
                      key={session.id}
                      onPress={() => setExpanded(isOpen ? null : session.id)}
                      activeOpacity={0.82}
                      style={st.card}
                    >
                      <View style={[st.cardInner, { borderLeftColor: meta.accent }]}>
                        <View style={st.cardRow}>
                          <View style={[st.modeIcon, { backgroundColor: `${meta.accent}20`, borderColor: `${meta.accent}66` }]}>
                            <Text style={[st.modeIconText, { color: meta.accent }]}>{meta.icon}</Text>
                          </View>
                          <View style={st.cardMid}>
                            <Text style={st.cardTitle} numberOfLines={1}>{session.title || meta.label}</Text>
                            <Text style={st.cardSub}>
                              {formatDuration(session.durationSeconds)} · {session.coachingCount} tips · score {session.score}
                            </Text>
                          </View>
                          <Text style={[st.cardArrow, { color: meta.accent }]}>{isOpen ? 'Hide' : 'View'}</Text>
                        </View>

                        {isOpen && session.analysis ? (
                          <View style={st.analysis}>
                            <Text style={st.analysisSummary}>{session.analysis.summary}</Text>
                            {session.analysis.strengths.length > 0 ? (
                              <View style={st.analysisSection}>
                                <Text style={[st.analysisSectionLabel, { color: meta.accent }]}>Strengths</Text>
                                {session.analysis.strengths.map((item, index) => (
                                  <Text key={index} style={st.analysisItem}>- {item}</Text>
                                ))}
                              </View>
                            ) : null}
                            {session.analysis.improvements.length > 0 ? (
                              <View style={st.analysisSection}>
                                <Text style={[st.analysisSectionLabel, { color: meta.accent }]}>Improve next</Text>
                                {session.analysis.improvements.map((item, index) => (
                                  <Text key={index} style={st.analysisItem}>- {item}</Text>
                                ))}
                              </View>
                            ) : null}
                            {session.analysis.keyMoment ? (
                              <Text style={st.analysisKeyMoment}>Key moment: {session.analysis.keyMoment}</Text>
                            ) : null}
                            <View style={st.transcriptCard}>
                              <Text style={st.transcriptLabel}>Transcript excerpt</Text>
                              <Text style={st.transcriptText}>{renderHighlighted(buildTranscriptExcerpt(session))}</Text>
                            </View>
                            {session.analysis.followUps.length > 0 ? (
                              <View style={st.analysisSection}>
                                <Text style={[st.analysisSectionLabel, { color: meta.accent }]}>Next moves</Text>
                                {session.analysis.followUps.map((item, index) => (
                                  <View key={index} style={st.followRow}>
                                    <Text style={[st.followTiming, { color: meta.accent }]}>{item.timing}</Text>
                                    <Text style={st.followText}>{item.text}</Text>
                                  </View>
                                ))}
                              </View>
                            ) : null}
                            <View style={st.cardActions}>
                              <TouchableOpacity
                                onPress={() => onStartMode(session.mode as ConversationMode)}
                                style={[st.cardActionBtn, { borderColor: meta.accent }]}
                                activeOpacity={0.8}
                              >
                                <Text style={[st.cardActionText, { color: meta.accent }]}>Run again</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => shareSession(session)}
                                style={st.cardActionBtn}
                                activeOpacity={0.8}
                              >
                                <Text style={st.cardActionText}>Share recap</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => Share.share({ message: session.transcriptText || buildShareText(session) }).catch(() => {})}
                                style={st.cardActionBtn}
                                activeOpacity={0.8}
                              >
                                <Text style={st.cardActionText}>Share transcript</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : null}

                        {isOpen && !session.analysis ? (
                          <View style={st.analysis}>
                            <Text style={st.analysisSummary}>No analysis available for this session.</Text>
                          </View>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={st.metric}>
      <Text style={st.metricValue}>{value}</Text>
      <Text style={st.metricLabel}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050510' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: { minWidth: 64 },
  backText: { color: '#818cf8', fontSize: 15, fontWeight: '800' },
  title: { color: '#f8fafc', fontSize: 18, fontWeight: '900' },
  headerSpacer: { width: 64 },
  loadingWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { color: '#64748b', fontSize: 14 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  emptyTitle: { color: '#f8fafc', fontSize: 20, fontWeight: '900' },
  emptyBody: { color: '#94a3b8', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  list: { paddingHorizontal: 18, paddingBottom: 42, gap: 10 },
  searchCard: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 8,
    padding: 14,
    gap: 8,
  },
  searchLabel: { color: '#64748b', fontSize: 11, fontWeight: '900', letterSpacing: 0.4 },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 14,
  },
  searchHint: { color: '#64748b', fontSize: 11, lineHeight: 16 },
  dashboard: {
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.2)',
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  dashboardTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '900' },
  metricRow: { flexDirection: 'row', gap: 10 },
  metric: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
  },
  metricValue: { color: '#f8fafc', fontSize: 17, fontWeight: '900' },
  metricLabel: { color: '#94a3b8', fontSize: 11, marginTop: 3 },
  quickActions: { flexDirection: 'row', gap: 10 },
  quickPrimary: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 12,
  },
  quickPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  quickSecondary: {
    flex: 1.2,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 12,
  },
  quickSecondaryText: { color: '#e2e8f0', fontSize: 13, fontWeight: '800' },
  insightCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  insightLabel: { color: '#818cf8', fontSize: 11, fontWeight: '900' },
  insightText: { color: '#cbd5e1', fontSize: 13, lineHeight: 19 },
  groupLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 16,
    marginBottom: 6,
  },
  card: { borderRadius: 8, overflow: 'hidden', marginBottom: 8 },
  cardInner: {
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.075)',
    borderLeftWidth: 3,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIconText: { fontSize: 13, fontWeight: '900' },
  cardMid: { flex: 1, gap: 3 },
  cardTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '900' },
  cardSub: { color: '#64748b', fontSize: 12 },
  cardArrow: { fontSize: 12, fontWeight: '900' },
  analysis: { marginTop: 14, gap: 10 },
  analysisSummary: { color: '#cbd5e1', fontSize: 14, lineHeight: 20 },
  analysisSection: { gap: 3 },
  analysisSectionLabel: { fontSize: 11, fontWeight: '900' },
  analysisItem: { color: '#94a3b8', fontSize: 13, lineHeight: 19 },
  analysisKeyMoment: { color: '#64748b', fontSize: 12, fontStyle: 'italic' },
  transcriptCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    padding: 10,
    gap: 5,
  },
  transcriptLabel: { color: '#64748b', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  transcriptText: { color: '#cbd5e1', fontSize: 12, lineHeight: 17 },
  searchHighlight: {
    color: '#f8fafc',
    backgroundColor: 'rgba(129,140,248,0.25)',
  },
  followRow: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  followTiming: { fontSize: 11, fontWeight: '900' },
  followText: { color: '#cbd5e1', fontSize: 13, lineHeight: 18 },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cardActionBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  cardActionText: { color: '#e2e8f0', fontSize: 12, fontWeight: '900' },
});
