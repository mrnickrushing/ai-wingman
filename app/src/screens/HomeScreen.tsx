import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { loadStats, PersistedStats } from '../utils/statsStorage';
import { ConversationMode } from '../types';
import { fetchStatsSnapshot, type SessionSnapshotSource } from '../services/sessionService';

type Mode = {
  id: ConversationMode;
  abbr: string;
  label: string;
  subtitle: string;
  accent: string;
};

const MODES: Mode[] = [
  { id: 'sales', abbr: 'SL', label: 'Sales', subtitle: 'Objections and closes', accent: '#6366f1' },
  { id: 'dating', abbr: 'DT', label: 'Dating', subtitle: 'Presence and momentum', accent: '#ec4899' },
  { id: 'networking', abbr: 'NW', label: 'Networking', subtitle: 'Rooms and follow-ups', accent: '#22d3ee' },
  { id: 'pitching', abbr: 'PT', label: 'Pitching', subtitle: 'Delivery and Q&A', accent: '#f59e0b' },
  { id: 'hard_conversations', abbr: 'HT', label: 'Hard Talk', subtitle: 'Calm, clear, direct', accent: '#8b5cf6' },
];

interface Props {
  onSelectMode: (modeId: string) => void;
  onOpenBriefs: () => void;
  onOpenAccount: () => void;
  onOpenHistory: () => void;
  onOpenPractice: () => void;
  onOpenMessages: () => void;
}

export function HomeScreen({
  onSelectMode,
  onOpenBriefs,
  onOpenAccount,
  onOpenHistory,
  onOpenPractice,
  onOpenMessages,
}: Props) {
  const [stats, setStats] = useState<PersistedStats>({
    sessions: 0,
    bestScore: 0,
    streak: 0,
    lastSessionDate: null,
  });
  const [statsSource, setStatsSource] = useState<SessionSnapshotSource>('empty');

  useEffect(() => {
    loadStats().then(setStats);
    fetchStatsSnapshot().then(({ stats: s, source }) => {
      setStatsSource(source);
      if (s) {
        setStats((prev) => ({
          ...prev,
          sessions: s.totalSessions,
          bestScore: s.bestScore,
          streak: s.streak,
        }));
      }
    });
  }, []);

  return (
    <View style={s.root}>
      <LinearGradient colors={['#090914', '#050510']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>AI Wingman</Text>
            <Text style={s.tagline}>Live coaching for high-stakes conversations</Text>
          </View>
          <TouchableOpacity onPress={onOpenAccount} style={s.accountBtn} hitSlop={8}>
            <Text style={s.accountBtnText}>Settings</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {/* Status / hero panel */}
          <View style={s.commandPanel}>
            <View style={s.statusRow}>
              <View style={s.liveBadge}>
                <View style={s.liveDot} />
                <Text style={s.liveText}>READY</Text>
              </View>
              {statsSource === 'cache' ? (
                <View style={s.cacheBadge}>
                  <Text style={s.cacheBadgeText}>Offline cache</Text>
                </View>
              ) : null}
            </View>
            <Text style={s.heroTitle}>Choose the room{`\n`}you need to win.</Text>
            <Text style={s.heroBody}>
              Pick a mode below to start a live coached session.
            </Text>
            <View style={s.commandActions}>
              <TouchableOpacity onPress={onOpenPractice} style={s.primaryAction} activeOpacity={0.82}>
                <Text style={s.primaryActionText}>Practice</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onOpenBriefs} style={s.secondaryAction} activeOpacity={0.82}>
                <Text style={s.secondaryActionText}>Briefs</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onOpenMessages} style={s.secondaryAction} activeOpacity={0.82}>
                <Text style={s.secondaryActionText}>Text Coach</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats row */}
          <View style={s.metricsRow}>
            <Metric label="Sessions" value={stats.sessions.toString()} />
            <Metric label="Best" value={stats.bestScore > 0 ? stats.bestScore.toString() : '--'} />
            <Metric
              label="Streak"
              value={stats.streak > 0 ? `${stats.streak}d` : '--'}
              highlight={stats.streak >= 3}
            />
          </View>

          {/* Mode grid */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Modes</Text>
            <Text style={s.sectionAction}>Tap to start a live session</Text>
          </View>
          <View style={s.modeGrid}>
            {MODES.map((mode) => (
              <TouchableOpacity
                key={mode.id}
                style={[s.modeTile, { borderTopColor: mode.accent }]}
                activeOpacity={0.78}
                onPress={() => onSelectMode(mode.id)}
              >
                <View style={[s.modeIcon, { borderColor: `${mode.accent}55`, backgroundColor: `${mode.accent}18` }]}>
                  <Text style={[s.modeIconText, { color: mode.accent }]}>{mode.abbr}</Text>
                </View>
                <Text style={s.modeLabel}>{mode.label}</Text>
                <Text style={s.modeSub} numberOfLines={2}>{mode.subtitle}</Text>
                <Text style={[s.modeStart, { color: mode.accent }]}>Start ›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={[s.metric, highlight && s.metricHighlight]}>
      <Text style={[s.metricValue, highlight && s.metricValueHighlight]}>{value}</Text>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050510' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  brand: { color: '#f8fafc', fontSize: 24, fontWeight: '900' },
  tagline: { color: '#64748b', fontSize: 11, marginTop: 3 },
  accountBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  accountBtnText: { color: '#94a3b8', fontSize: 12, fontWeight: '800' },
  content: { paddingHorizontal: 18, paddingBottom: 120, gap: 16 },

  // Hero / command panel
  commandPanel: {
    borderRadius: 12,
    padding: 20,
    backgroundColor: 'rgba(99,102,241,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.20)',
    gap: 14,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(74,222,128,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.26)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80' },
  liveText: { color: '#4ade80', fontSize: 10, fontWeight: '900' },
  cacheBadge: {
    borderRadius: 999,
    backgroundColor: 'rgba(251,191,36,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.24)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  cacheBadgeText: { color: '#fbbf24', fontSize: 10, fontWeight: '900' },
  heroTitle: { color: '#f8fafc', fontSize: 28, fontWeight: '900', lineHeight: 34 },
  heroBody: { color: '#94a3b8', fontSize: 13, lineHeight: 20 },
  commandActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  primaryAction: {
    minWidth: 104,
    flexGrow: 1,
    backgroundColor: '#6366f1',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 14,
  },
  primaryActionText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  secondaryAction: {
    minWidth: 104,
    flexGrow: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 14,
  },
  secondaryActionText: { color: '#cbd5e1', fontSize: 14, fontWeight: '800' },

  // Metrics
  metricsRow: { flexDirection: 'row', gap: 10 },
  metric: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  metricHighlight: {
    backgroundColor: 'rgba(99,102,241,0.12)',
    borderColor: 'rgba(129,140,248,0.28)',
  },
  metricValue: { color: '#f8fafc', fontSize: 20, fontWeight: '900' },
  metricValueHighlight: { color: '#818cf8' },
  metricLabel: { color: '#64748b', fontSize: 11, marginTop: 3 },

  // Section header
  sectionHeader: { gap: 2 },
  sectionTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '900' },
  sectionAction: { color: '#64748b', fontSize: 12 },

  // Mode grid
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  modeTile: {
    width: '48.5%',
    minHeight: 140,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderTopWidth: 2.5,
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  modeIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIconText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  modeLabel: { color: '#f8fafc', fontSize: 15, fontWeight: '900' },
  modeSub: { color: '#94a3b8', fontSize: 12, lineHeight: 17, flex: 1 },
  modeStart: { fontSize: 12, fontWeight: '900', marginTop: 2 },
});
