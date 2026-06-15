import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { loadStats, PersistedStats } from '../utils/statsStorage';
import { ConversationMode } from '../types';
import { fetchStatsSnapshot, type SessionSnapshotSource } from '../services/sessionService';

type Mode = {
  id: ConversationMode;
  icon: string;
  label: string;
  subtitle: string;
  accent: string;
};

const MODES: Mode[] = [
  { id: 'sales',              icon: '🤝', label: 'Sales',      subtitle: 'Objections and closes',    accent: '#6366f1' },
  { id: 'dating',             icon: '✨', label: 'Dating',     subtitle: 'Presence and momentum',    accent: '#ec4899' },
  { id: 'networking',         icon: '💬', label: 'Networking', subtitle: 'Rooms and follow-ups',     accent: '#22d3ee' },
  { id: 'pitching',           icon: '🚀', label: 'Pitching',   subtitle: 'Delivery and Q&A',         accent: '#f59e0b' },
  { id: 'hard_conversations', icon: '⚡', label: 'Hard Talk',  subtitle: 'Calm, clear, direct',      accent: '#8b5cf6' },
];

const XP_PER_SESSION = 10;
const XP_PER_LEVEL = 50;

function computeXP(sessions: number) {
  const totalXP = sessions * XP_PER_SESSION;
  const level = Math.floor(totalXP / XP_PER_LEVEL) + 1;
  const xpInLevel = totalXP % XP_PER_LEVEL;
  const xpProgress = xpInLevel / XP_PER_LEVEL;
  return { level, xpInLevel, xpProgress, totalXP };
}

// ─── PulsingOrb ─────────────────────────────────────────────────────────────
function PulsingOrb({ color = '#6366f1' }: { color?: string }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sine),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [anim]);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.28] });
  const scale   = anim.interpolate({ inputRange: [0, 1], outputRange: [0.9,  1.1]  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        {
          alignItems: 'center',
          justifyContent: 'center',
          opacity,
          transform: [{ scale }],
        },
      ]}
    >
      <View
        style={{
          width: 260,
          height: 260,
          borderRadius: 130,
          backgroundColor: color,
        }}
      />
    </Animated.View>
  );
}

// ─── AnimatedCounter ─────────────────────────────────────────────────────────
function AnimatedCounter({ value, style }: { value: number; style?: object }) {
  const anim   = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: value,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    const id = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
    return () => anim.removeListener(id);
  }, [value, anim]);

  return <Text style={style}>{display}</Text>;
}

// ─── Props ───────────────────────────────────────────────────────────────────
interface Props {
  onSelectMode: (modeId: string) => void;
  onOpenBriefs: () => void;
  onOpenAccount: () => void;
  onOpenHistory: () => void;
  onOpenPractice: () => void;
  onOpenMessages: () => void;
}

// ─── HomeScreen ──────────────────────────────────────────────────────────────
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

  const xpAnim      = useRef(new Animated.Value(0)).current;
  const prevSessions = useRef(0);

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

  useEffect(() => {
    if (stats.sessions === prevSessions.current) return;
    prevSessions.current = stats.sessions;
    const { xpProgress } = computeXP(stats.sessions);
    Animated.timing(xpAnim, {
      toValue: xpProgress,
      duration: 1100,
      delay: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [stats.sessions, xpAnim]);

  const { level, xpInLevel } = computeXP(stats.sessions);
  const xpBarWidth = xpAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  const isNewUser = stats.sessions === 0;

  return (
    <View style={s.root}>
      <LinearGradient colors={['#090914', '#050510']} style={StyleSheet.absoluteFill} />

      {/* Ambient background orb */}
      <View pointerEvents="none" style={s.ambientOrb} />

      <SafeAreaView style={s.safe}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.brand}>AI Wingman</Text>
            <Text style={s.tagline}>Live coaching for high-stakes conversations</Text>
          </View>
          <TouchableOpacity onPress={onOpenAccount} style={s.accountBtn} hitSlop={8}>
            <Text style={s.accountBtnText}>Account</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          {/* ── Hero / Command Panel ── */}
          <View style={s.commandPanel}>
            <PulsingOrb color="#6366f1" />
            <View style={s.statusRow}>
              <View style={s.liveBadge}>
                <View style={s.liveDot} />
                <Text style={s.liveText}>READY</Text>
              </View>
              {statsSource === 'cache' && (
                <View style={s.cacheBadge}>
                  <Text style={s.cacheBadgeText}>Offline cache</Text>
                </View>
              )}
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

          {/* ── Stats Row ── */}
          <View style={s.metricsRow}>
            <MetricCard label="Sessions" value={stats.sessions} animated />
            <MetricCard
              label="Best"
              rawValue={stats.bestScore > 0 ? stats.bestScore.toString() : '--'}
              value={stats.bestScore}
              animated={stats.bestScore > 0}
            />
            <MetricCard
              label="Streak"
              rawValue={stats.streak > 0 ? `${stats.streak}d` : '--'}
              value={stats.streak}
              highlight={stats.streak >= 3}
              fire={stats.streak >= 3}
              animated={false}
            />
          </View>

          {/* ── Mission 1 card (new users only) ── */}
          {isNewUser && (
            <View style={s.missionCard}>
              <View style={s.missionHeader}>
                <View style={s.missionBadge}>
                  <Text style={s.missionBadgeText}>MISSION 1</Text>
                </View>
                <Text style={s.missionTitle}>Get Started</Text>
              </View>
              <View style={s.missionSteps}>
                <MissionStep index={1} text="Run a live session" done={false} />
                <MissionStep index={2} text="Complete 3 sessions" done={false} />
                <MissionStep index={3} text="Hit your first 80+ score" done={false} />
              </View>
            </View>
          )}

          {/* ── XP / Level Bar ── */}
          <View style={s.xpCard}>
            <View style={s.xpRow}>
              <View style={s.levelBadge}>
                <Text style={s.levelText}>LVL {level}</Text>
              </View>
              <Text style={s.xpLabel}>Coach XP</Text>
              <Text style={s.xpCount}>{xpInLevel} / {XP_PER_LEVEL} XP</Text>
            </View>
            <View style={s.xpTrack}>
              <Animated.View style={[s.xpFill, { width: xpBarWidth }]} />
              <Animated.View style={[s.xpGlowDot, { left: xpBarWidth }]} />
            </View>
            <Text style={s.xpHint}>
              {isNewUser
                ? 'Complete sessions to earn XP and level up your coaching profile.'
                : `${XP_PER_LEVEL - xpInLevel} XP to reach Level ${level + 1}`}
            </Text>
          </View>

          {/* ── Mode Grid ── */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Modes</Text>
            <Text style={s.sectionAction}>Tap to start a live session</Text>
          </View>
          <View style={s.modeGrid}>
            {MODES.map((mode) => (
              <TouchableOpacity
                key={mode.id}
                activeOpacity={0.78}
                onPress={() => onSelectMode(mode.id)}
                style={s.modeTileWrapper}
              >
                <View style={s.modeTile}>
                  {/* Top accent bar */}
                  <View style={[s.modeTileAccentBar, { backgroundColor: mode.accent }]} />
                  {/* Gradient wash top-to-transparent */}
                  <LinearGradient
                    colors={[`${mode.accent}28`, 'transparent']}
                    style={s.modeTileGradient}
                  />
                  <View style={s.modeTileContent}>
                    <View
                      style={[
                        s.modeIcon,
                        { borderColor: `${mode.accent}55`, backgroundColor: `${mode.accent}18` },
                      ]}
                    >
                      <Text style={s.modeIconEmoji}>{mode.icon}</Text>
                    </View>
                    <Text style={s.modeLabel}>{mode.label}</Text>
                    <Text style={s.modeSub} numberOfLines={2}>{mode.subtitle}</Text>
                    <Text style={[s.modeStart, { color: mode.accent }]}>Start ›</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── MetricCard ───────────────────────────────────────────────────────────────
function MetricCard({
  label,
  value,
  rawValue,
  highlight,
  fire,
  animated,
}: {
  label: string;
  value: number;
  rawValue?: string;
  highlight?: boolean;
  fire?: boolean;
  animated: boolean;
}) {
  const displayRaw = rawValue ?? value.toString();
  return (
    <View style={[s.metric, highlight && s.metricHighlight]}>
      {animated && value > 0 ? (
        <AnimatedCounter value={value} style={[s.metricValue, highlight && s.metricValueHighlight]} />
      ) : (
        <Text style={[s.metricValue, highlight && s.metricValueHighlight]}>
          {fire ? '🔥 ' : ''}{displayRaw}
        </Text>
      )}
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}

// ─── MissionStep ─────────────────────────────────────────────────────────────
function MissionStep({ index, text, done }: { index: number; text: string; done: boolean }) {
  return (
    <View style={s.missionStep}>
      <View style={[s.missionStepDot, done && s.missionStepDotDone]}>
        {done ? (
          <Text style={s.missionStepCheck}>✓</Text>
        ) : (
          <Text style={s.missionStepNum}>{index}</Text>
        )}
      </View>
      <Text style={[s.missionStepText, done && s.missionStepTextDone]}>{text}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050510' },
  safe: { flex: 1 },

  ambientOrb: {
    position: 'absolute',
    top: -120,
    right: -100,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: '#6366f118',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  brand: { fontSize: 22, fontWeight: '900', color: '#f1f5f9', letterSpacing: -0.5 },
  tagline: { fontSize: 12, fontWeight: '400', color: '#64748b', marginTop: 2 },
  accountBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#334155',
  },
  accountBtnText: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },

  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },

  commandPanel: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 24,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
    position: 'relative',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#052e16',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#166534',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  liveText: { fontSize: 11, fontWeight: '700', color: '#4ade80', letterSpacing: 1 },
  cacheBadge: {
    backgroundColor: '#1c1917',
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#44403c',
  },
  cacheBadgeText: { fontSize: 11, fontWeight: '700', color: '#a8a29e' },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#f1f5f9',
    lineHeight: 34,
    letterSpacing: -0.6,
    marginBottom: 10,
  },
  heroBody: { fontSize: 14, fontWeight: '400', color: '#64748b', lineHeight: 20, marginBottom: 20 },
  commandActions: { flexDirection: 'row', gap: 10 },
  primaryAction: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  primaryActionText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  secondaryAction: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  secondaryActionText: { fontSize: 14, fontWeight: '700', color: '#94a3b8' },

  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  metric: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  metricHighlight: { backgroundColor: '#1a0e2e', borderColor: '#7c3aed44' },
  metricValue: { fontSize: 22, fontWeight: '800', color: '#f1f5f9', letterSpacing: -0.5 },
  metricValueHighlight: { color: '#a78bfa' },
  metricLabel: {
    fontSize: 11,
    fontWeight: '400',
    color: '#475569',
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  missionCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  missionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  missionBadge: {
    backgroundColor: '#1e1b4b',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#4338ca55',
  },
  missionBadgeText: { fontSize: 10, fontWeight: '700', color: '#818cf8', letterSpacing: 1.2 },
  missionTitle: { fontSize: 15, fontWeight: '800', color: '#e2e8f0' },
  missionSteps: { gap: 10 },
  missionStep: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  missionStepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1e293b',
    borderWidth: 1.5,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionStepDotDone: { backgroundColor: '#052e16', borderColor: '#166534' },
  missionStepNum: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  missionStepCheck: { fontSize: 12, fontWeight: '700', color: '#4ade80' },
  missionStepText: { fontSize: 14, fontWeight: '400', color: '#94a3b8' },
  missionStepTextDone: { color: '#475569', textDecorationLine: 'line-through' },

  xpCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  xpRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  levelBadge: {
    backgroundColor: '#1e1b4b',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#4338ca55',
  },
  levelText: { fontSize: 11, fontWeight: '700', color: '#818cf8', letterSpacing: 0.8 },
  xpLabel: { flex: 1, fontSize: 13, fontWeight: '800', color: '#94a3b8' },
  xpCount: { fontSize: 12, fontWeight: '700', color: '#475569' },
  xpTrack: {
    height: 6,
    backgroundColor: '#1e293b',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
    position: 'relative',
  },
  xpFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 3,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  xpGlowDot: {
    position: 'absolute',
    top: -3,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#818cf8',
    marginLeft: -6,
    shadowColor: '#818cf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  xpHint: { fontSize: 12, fontWeight: '400', color: '#475569', lineHeight: 17 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#e2e8f0', letterSpacing: -0.3 },
  sectionAction: { fontSize: 12, fontWeight: '400', color: '#475569' },

  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  modeTileWrapper: { width: '47.5%' },
  modeTile: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e293b',
    position: 'relative',
  },
  modeTileAccentBar: { height: 2.5, width: '100%' },
  modeTileGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 70,
  },
  modeTileContent: { padding: 14 },
  modeIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modeIconEmoji: { fontSize: 20 },
  modeLabel: { fontSize: 15, fontWeight: '800', color: '#e2e8f0', marginBottom: 4, letterSpacing: -0.2 },
  modeSub: { fontSize: 12, fontWeight: '400', color: '#64748b', lineHeight: 16, marginBottom: 10 },
  modeStart: { fontSize: 13, fontWeight: '700' },
});
