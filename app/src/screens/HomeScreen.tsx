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
  onOpenBriefs: () => void;
  onOpenAccount: () => void;
  onOpenHistory: () => void;
  onOpenPractice: () => void;
  onOpenPlaybooks: () => void;
  onOpenMessages: () => void;
}

export function HomeScreen({
  onSelectMode,
  onOpenBriefs,
  onOpenAccount,
  onOpenHistory,
  onOpenPractice,
  onOpenPlaybooks,
  onOpenMessages,
}: Props) {
  const [stats, setStats] = useState<PersistedStats>({
    sessions: 0,
    bestScore: 0,
    streak: 0,
    lastSessionDate: null,
  });

  useEffect(() => {
    loadStats().then(setStats);
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
          <View style={s.commandPanel}>
            <View style={s.statusRow}>
              <View style={s.liveBadge}>
                <View style={s.liveDot} />
                <Text style={s.liveText}>READY</Text>
              </View>
              <Text style={s.statusCopy}>Mic, transcript, and server checks run before every session.</Text>
            </View>
            <Text style={s.heroTitle}>Choose the room you need to win.</Text>
            <Text style={s.heroBody}>
              The home screen stays focused. Open a page for briefs, text coaching, history, or playbooks.
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

          <View style={s.metricsRow}>
            <Metric label="Sessions" value={stats.sessions.toString()} />
            <Metric label="Best" value={stats.bestScore > 0 ? stats.bestScore.toString() : '--'} />
            <Metric label="Streak" value={stats.streak > 0 ? `${stats.streak}d` : '--'} />
          </View>

          <SectionTitle title="Pages" action="Open a focused workspace" />
          <View style={s.pageGrid}>
            <PageCard
              title="Briefs"
              subtitle="Prep notes and recaps in one place."
              action="Open"
              onPress={onOpenBriefs}
            />
            <PageCard
              title="Text Coach"
              subtitle="Draft replies for real conversations."
              action="Open"
              onPress={onOpenMessages}
            />
            <PageCard
              title="History"
              subtitle="Search sessions, scores, and transcripts."
              action="Open"
              onPress={onOpenHistory}
            />
            <PageCard
              title="Playbooks"
              subtitle="Reuse your best setups and pinned prompts."
              action="Open"
              onPress={onOpenPlaybooks}
            />
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

function PageCard({
  title,
  subtitle,
  action,
  onPress,
}: {
  title: string;
  subtitle: string;
  action: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={s.pageCard} activeOpacity={0.84}>
      <View style={s.pageTop}>
        <Text style={s.pageTitle}>{title}</Text>
        <Text style={s.pageAction}>{action}</Text>
      </View>
      <Text style={s.pageSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
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
  commandActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  primaryAction: {
    minWidth: 104,
    flexGrow: 1,
    backgroundColor: '#6366f1',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 14,
  },
  primaryActionText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  secondaryAction: {
    minWidth: 104,
    flexGrow: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 14,
  },
  secondaryActionText: { color: '#e2e8f0', fontSize: 14, fontWeight: '900' },
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
  pageGrid: { gap: 10 },
  pageCard: {
    borderRadius: 8,
    padding: 14,
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pageTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pageTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '900' },
  pageAction: { color: '#cbd5e1', fontSize: 12, fontWeight: '800' },
  pageSubtitle: { color: '#94a3b8', fontSize: 12, lineHeight: 17 },
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
});
