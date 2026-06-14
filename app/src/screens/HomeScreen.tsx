import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { loadStats, PersistedStats } from '../utils/statsStorage';
import { loadSessionRecaps } from '../utils/sessionArchive';
import { ConversationMode, SessionRecap } from '../types';
import { PrepPacketCard } from '../components/PrepPacketCard';
import { fetchStats } from '../services/sessionService';

type Mode = {
  id: ConversationMode;
  icon: string;
  label: string;
  subtitle: string;
  accent: string;
};

const MODES: Mode[] = [
  { id: 'sales', icon: 'S', label: 'Sales', subtitle: 'Objections and closes', accent: '#6366f1' },
  { id: 'dating', icon: 'D', label: 'Dating', subtitle: 'Presence and momentum', accent: '#ec4899' },
  { id: 'networking', icon: 'N', label: 'Networking', subtitle: 'Rooms and follow-ups', accent: '#22d3ee' },
  { id: 'pitching', icon: 'P', label: 'Pitching', subtitle: 'Delivery and Q&A', accent: '#f59e0b' },
  { id: 'hard_conversations', icon: 'H', label: 'Hard Talk', subtitle: 'Calm, clear, direct', accent: '#8b5cf6' },
];

interface Props {
  onSelectMode: (modeId: string) => void;
  onOpenAccount: () => void;
  onOpenHistory: () => void;
  onOpenPractice: () => void;
  onOpenPlaybooks: () => void;
  onOpenMessages: () => void;
}

export function HomeScreen({
  onSelectMode,
  onOpenAccount,
  onOpenHistory,
  onOpenPractice,
  onOpenPlaybooks,
  onOpenMessages,
}: Props) {
  const [stats, setStats] = useState<PersistedStats>({
    sessions: 0, bestScore: 0, streak: 0, lastSessionDate: null,
  });
  const [recentRecaps, setRecentRecaps] = useState<SessionRecap[]>([]);

  useEffect(() => {
    loadStats().then(setStats);
    loadSessionRecaps(3).then(setRecentRecaps);
    fetchStats().then((s) => {
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

  const nextFocus = useMemo(() => {
    const last = recentRecaps[0];
    if (!last) return 'Pick a mode and run your first coached session.';
    const weak = last.improvements?.[0] ?? last.followUps?.[0]?.text ?? last.highlights[0] ?? last.summary;
    return weak.length > 92 ? `${weak.slice(0, 92)}...` : weak;
  }, [recentRecaps]);

  const resumeMode = recentRecaps[0]?.mode ?? null;
  const resumeLabel = resumeMode
    ? MODES.find((mode) => mode.id === resumeMode)?.label ?? 'Last mode'
    : null;

  return (
    <View style={s.root}>
      <LinearGradient colors={['#090914', '#050510']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>AI Wingman</Text>
            <Text style={s.tagline}>Live coaching for high-stakes conversations</Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity onPress={onOpenHistory} style={s.iconButton} hitSlop={8}>
              <Text style={s.iconButtonText}>H</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onOpenAccount} style={s.iconButton} hitSlop={8}>
              <Text style={s.iconButtonText}>A</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <PrepPacketCard latestRecap={recentRecaps[0] ?? null} onResumeMode={(mode) => onSelectMode(mode)} />
          <View style={s.commandPanel}>
            <View style={s.statusRow}>
              <View style={s.liveBadge}>
                <View style={s.liveDot} />
                <Text style={s.liveText}>READY</Text>
              </View>
              <Text style={s.statusCopy}>Mic, transcript, and server checks run before every session.</Text>
            </View>
            <Text style={s.heroTitle}>Choose the room you need to win.</Text>
            <Text style={s.heroBody}>{nextFocus}</Text>
            <View style={s.commandActions}>
              <TouchableOpacity onPress={onOpenPractice} style={s.primaryAction} activeOpacity={0.82}>
                <Text style={s.primaryActionText}>Practice</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onOpenPlaybooks} style={s.secondaryAction} activeOpacity={0.82}>
                <Text style={s.secondaryActionText}>Playbooks</Text>
              </TouchableOpacity>
            </View>

            {resumeMode ? (
              <TouchableOpacity onPress={() => onSelectMode(resumeMode)} style={s.resumeCard} activeOpacity={0.82}>
                <View style={s.resumeTop}>
                  <Text style={s.resumeLabel}>Resume last mode</Text>
                  <Text style={s.resumeAction}>Continue</Text>
                </View>
                <Text style={s.resumeTitle}>{resumeLabel}</Text>
                <Text style={s.resumeBody} numberOfLines={2}>
                  {nextFocus}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity onPress={onOpenMessages} activeOpacity={0.84} style={s.messageCoachCard}>
            <View style={s.messageCoachTop}>
              <Text style={s.messageCoachLabel}>Text Coach</Text>
              <Text style={s.messageCoachAction}>Open</Text>
            </View>
            <Text style={s.messageCoachTitle}>Draft replies for real conversations.</Text>
            <Text style={s.messageCoachBody}>
              Paste a thread, choose the tone, and get a reply that feels natural instead of robotic.
            </Text>
            <View style={s.messageCoachPills}>
              <View style={s.messageCoachPill}><Text style={s.messageCoachPillText}>Dating</Text></View>
              <View style={s.messageCoachPill}><Text style={s.messageCoachPillText}>Follow-up</Text></View>
              <View style={s.messageCoachPill}><Text style={s.messageCoachPillText}>Boundary</Text></View>
            </View>
          </TouchableOpacity>

          <View style={s.metricsRow}>
            <Metric label="Sessions" value={stats.sessions.toString()} />
            <Metric label="Best" value={stats.bestScore > 0 ? stats.bestScore.toString() : '--'} />
            <Metric label="Streak" value={stats.streak > 0 ? `${stats.streak}d` : '--'} />
          </View>

          <SectionTitle title="Modes" action="Start live coaching" />
          <View style={s.modeGrid}>
            {MODES.map((mode) => (
              <TouchableOpacity
                key={mode.id}
                style={s.modeTile}
                activeOpacity={0.78}
                onPress={() => onSelectMode(mode.id)}
              >
                <View style={[s.modeIcon, { borderColor: mode.accent, backgroundColor: `${mode.accent}20` }]}>
                  <Text style={[s.modeIconText, { color: mode.accent }]}>{mode.icon}</Text>
                </View>
                <Text style={s.modeLabel}>{mode.label}</Text>
                <Text style={s.modeSub} numberOfLines={2}>{mode.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <SectionTitle title="Recent sessions" action="Review and improve" />
          {recentRecaps.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyTitle}>No sessions yet</Text>
              <Text style={s.emptyBody}>Complete one live session or a practice run to start building your coaching history.</Text>
            </View>
          ) : (
            <View style={s.recentList}>
              {recentRecaps.map((recap) => (
                <View key={recap.id} style={s.recentCard}>
                  <View style={s.recentTop}>
                    <Text style={s.recentTitle} numberOfLines={1}>{recap.title}</Text>
                    <Text style={s.recentScore}>{recap.score}</Text>
                  </View>
                  <Text style={s.recentSubtitle} numberOfLines={1}>{recap.subtitle}</Text>
                  <Text style={s.recentSummary} numberOfLines={2}>{recap.summary}</Text>
                  {recap.followUps?.[0] ? (
                    <View style={s.nextMove}>
                      <Text style={s.nextMoveLabel}>{recap.followUps[0].timing}</Text>
                      <Text style={s.nextMoveText} numberOfLines={1}>{recap.followUps[0].text}</Text>
                    </View>
                  ) : recap.improvements?.[0] ? (
                    <View style={s.nextMove}>
                      <Text style={s.nextMoveLabel}>Next</Text>
                      <Text style={s.nextMoveText} numberOfLines={1}>{recap.improvements[0]}</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.metric}>
      <Text style={s.metricValue}>{value}</Text>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}

function SectionTitle({ title, action }: { title: string; action: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      <Text style={s.sectionAction}>{action}</Text>
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
  tagline: { color: '#94a3b8', fontSize: 12, marginTop: 3 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: { color: '#cbd5e1', fontSize: 13, fontWeight: '900' },
  content: { paddingHorizontal: 18, paddingBottom: 42, gap: 18 },
  commandPanel: {
    borderRadius: 8,
    padding: 18,
    backgroundColor: 'rgba(99,102,241,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.22)',
    gap: 14,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(74,222,128,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.28)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80' },
  liveText: { color: '#4ade80', fontSize: 10, fontWeight: '900' },
  statusCopy: { color: '#94a3b8', fontSize: 11, flex: 1, lineHeight: 16 },
  heroTitle: { color: '#f8fafc', fontSize: 26, fontWeight: '900', lineHeight: 31 },
  heroBody: { color: '#cbd5e1', fontSize: 14, lineHeight: 21 },
  commandActions: { flexDirection: 'row', gap: 10 },
  primaryAction: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 14,
  },
  primaryActionText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  secondaryAction: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 14,
  },
  secondaryActionText: { color: '#e2e8f0', fontSize: 15, fontWeight: '900' },
  resumeCard: {
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 14,
    gap: 6,
  },
  resumeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  resumeLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  resumeAction: { color: '#818cf8', fontSize: 12, fontWeight: '900' },
  resumeTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '900' },
  resumeBody: { color: '#cbd5e1', fontSize: 13, lineHeight: 19 },
  messageCoachCard: {
    borderRadius: 8,
    padding: 16,
    backgroundColor: 'rgba(236,72,153,0.11)',
    borderWidth: 1,
    borderColor: 'rgba(244,114,182,0.22)',
    gap: 10,
  },
  messageCoachTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  messageCoachLabel: { color: '#f9a8d4', fontSize: 11, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  messageCoachAction: { color: '#f8fafc', fontSize: 12, fontWeight: '900' },
  messageCoachTitle: { color: '#f8fafc', fontSize: 20, fontWeight: '900', lineHeight: 24 },
  messageCoachBody: { color: '#cbd5e1', fontSize: 13, lineHeight: 20 },
  messageCoachPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  messageCoachPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  messageCoachPillText: { color: '#e2e8f0', fontSize: 11, fontWeight: '700' },
  metricsRow: { flexDirection: 'row', gap: 10 },
  metric: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  metricValue: { color: '#f8fafc', fontSize: 18, fontWeight: '900' },
  metricLabel: { color: '#64748b', fontSize: 11, marginTop: 3 },
  sectionHeader: { gap: 2, marginTop: 4 },
  sectionTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '900' },
  sectionAction: { color: '#64748b', fontSize: 12 },
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  modeTile: {
    width: '48.5%',
    minHeight: 132,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 8,
    padding: 14,
    gap: 8,
  },
  modeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIconText: { fontSize: 14, fontWeight: '900' },
  modeLabel: { color: '#f8fafc', fontSize: 15, fontWeight: '900' },
  modeSub: { color: '#94a3b8', fontSize: 12, lineHeight: 17 },
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 8,
    padding: 16,
    gap: 5,
  },
  emptyTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '900' },
  emptyBody: { color: '#94a3b8', fontSize: 13, lineHeight: 19 },
  recentList: { gap: 10 },
  recentCard: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 8,
    padding: 14,
    gap: 6,
  },
  recentTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recentTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '900', flex: 1 },
  recentScore: { color: '#818cf8', fontSize: 15, fontWeight: '900' },
  recentSubtitle: { color: '#64748b', fontSize: 12 },
  recentSummary: { color: '#cbd5e1', fontSize: 13, lineHeight: 19 },
  nextMove: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(99,102,241,0.09)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  nextMoveLabel: { color: '#818cf8', fontSize: 10, fontWeight: '900' },
  nextMoveText: { color: '#cbd5e1', flex: 1, fontSize: 11, fontWeight: '700' },
});
