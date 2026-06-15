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
  gradientColors: readonly [string, string];
};

const MODES: Mode[] = [
  { id: 'sales',              icon: '🤝', label: 'Sales',      subtitle: 'Objections and closes',    accent: '#6366f1', gradientColors: ['#6366f130', '#6366f108'] },
  { id: 'dating',             icon: '✨', label: 'Dating',     subtitle: 'Presence and momentum',    accent: '#ec4899', gradientColors: ['#ec489930', '#ec489908'] },
  { id: 'networking',         icon: '💬', label: 'Networking', subtitle: 'Rooms and follow-ups',     accent: '#22d3ee', gradientColors: ['#22d3ee30', '#22d3ee08'] },
  { id: 'pitching',           icon: '🚀', label: 'Pitching',   subtitle: 'Delivery and Q&A',         accent: '#f59e0b', gradientColors: ['#f59e0b30', '#f59e0b08'] },
  { id: 'hard_conversations', icon: '⚡', label: 'Hard Talk',  subtitle: 'Calm, clear, direct',      accent: '#8b5cf6', gradientColors: ['#8b5cf630', '#8b5cf608'] },
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
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
    // Sonar ring
    Animated.loop(
      Animated.sequence([
        Animated.timing(ring, { toValue: 1, duration: 2400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.delay(1200),
      ])
    ).start();
  }, [anim, ring]);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.10, 0.22] });
  const scale   = anim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.08] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.4, 0.1, 0] });
  const ringScale   = ring.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.6] });

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
          { opacity, transform: [{ scale }] },
        ]}
      >
        <View style={{ width: 280, height: 280, borderRadius: 140, backgroundColor: color }} />
      </Animated.View>
      {/* Sonar ring */}
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
          { opacity: ringOpacity, transform: [{ scale: ringScale }] },
        ]}
      >
        <View style={{ width: 220, height: 220, borderRadius: 110, borderWidth: 1.5, borderColor: color }} />
      </Animated.View>
    </>
  );
}

// ─── AnimatedCounter ─────────────────────────────────────────────────────────
function AnimatedCounter({ value, style }: { value: number; style?: object }) {
  const anim   = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: value, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();

    const id = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
    return () => anim.removeListener(id);
  }, [value, anim]);

  return <Text style={style}>{display}</Text>;
}

// ─── ModeCard ─────────────────────────────────────────────────────────────────
function ModeCard({ mode, onPress, delay }: { mode: Mode; onPress: () => void; delay: number }) {
  const entry = useRef(new Animated.Value(0)).current;
  const entryY = useRef(new Animated.Value(24)).current;
  const pressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entry, { toValue: 1, duration: 500, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(entryY, { toValue: 0, duration: 500, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[s.modeTileWrapper, { opacity: entry, transform: [{ translateY: entryY }] }]}>
      <TouchableOpacity
        activeOpacity={0.82}
        onPress={onPress}
        onPressIn={() => Animated.spring(pressAnim, { toValue: 0.97, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(pressAnim, { toValue: 1, useNativeDriver: true }).start()}
      >
        <Animated.View style={[s.modeTile, { transform: [{ scale: pressAnim }] }]}>
          {/* Top accent bar */}
          <View style={[s.modeTileAccentBar, { backgroundColor: mode.accent }]} />
          {/* Gradient wash */}
          <LinearGradient colors={mode.gradientColors} style={s.modeTileGradient} />
          {/* Glow border overlay */}
          <View style={[s.modeTileGlowBorder, { borderColor: mode.accent + '40' }]} />
          <View style={s.modeTileContent}>
            <View style={[s.modeIcon, { borderColor: mode.accent + '60', backgroundColor: mode.accent + '20' }]}>
              <Text style={s.modeIconEmoji}>{mode.icon}</Text>
            </View>
            <Text style={s.modeLabel}>{mode.label}</Text>
            <Text style={s.modeSub} numberOfLines={2}>{mode.subtitle}</Text>
            <View style={[s.modeStartRow, { backgroundColor: mode.accent + '18', borderColor: mode.accent + '40' }]}>
              <Text style={[s.modeStart, { color: mode.accent }]}>Start session →</Text>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
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
      <LinearGradient colors={['#090920', '#05050f']} style={StyleSheet.absoluteFill} />

      {/* Ambient orbs */}
      <View pointerEvents="none" style={s.ambientOrbTop} />
      <View pointerEvents="none" style={s.ambientOrbBottom} />

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
                <LinearGradient colors={['#6366f1', '#8b5cf6']} style={s.primaryActionGrad}>
                  <Text style={s.primaryActionText}>Practice</Text>
                </LinearGradient>
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
            {MODES.map((mode, i) => (
              <ModeCard
                key={mode.id}
                mode={mode}
                onPress={() => onSelectMode(mode.id)}
                delay={i * 80}
              />
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
  label, value, rawValue, highlight, fire, animated,
}: {
  label: string; value: number; rawValue?: string; highlight?: boolean; fire?: boolean; animated: boolean;
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
  root: { flex: 1, backgroundColor: '#05050f' },
  safe: { flex: 1 },

  // Two ambient orbs from HEAD (more atmospheric depth than single orb)
  ambientOrbTop: {
    position: 'absolute',
    top: -140,
    right: -110,
    width: 460,
    height: 460,
    borderRadius: 230,
    backgroundColor: 'rgba(99,102,241,0.10)',
  },
  ambientOrbBottom: {
    position: 'absolute',
    bottom: -100,
    left: -80,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(139,92,246,0.07)',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  // HEAD: larger font + tighter tracking feels more premium
  brand: { fontSize: 23, fontWeight: '900', color: '#f1f5f9', letterSpacing: -0.7 },
  tagline: { fontSize: 12, fontWeight: '400', color: '#475569', marginTop: 2 },
  accountBtn: {
    backgroundColor: '#161628',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#2d2d4e',
  },
  accountBtnText: { fontSize: 13, fontWeight: '700', color: '#7c7caa' },

  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },

  // HEAD: darker panel + indigo glow shadow feels more immersive
  commandPanel: {
    backgroundColor: '#0c0c1e',
    borderRadius: 22,
    padding: 24,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1a1a36',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#041f10',
    borderRadius: 99,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#145a30',
  },
  // HEAD: larger dot with glow shadow
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#22c55e', shadowColor: '#22c55e', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4 },
  liveText: { fontSize: 11, fontWeight: '800', color: '#4ade80', letterSpacing: 1.2 },
  cacheBadge: {
    backgroundColor: '#1c1917',
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#44403c',
  },
  cacheBadgeText: { fontSize: 11, fontWeight: '700', color: '#a8a29e' },
  // HEAD: larger hero title for more impact
  heroTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#f1f5f9',
    lineHeight: 36,
    letterSpacing: -0.8,
    marginBottom: 10,
  },
  heroBody: { fontSize: 14, fontWeight: '400', color: '#475569', lineHeight: 20, marginBottom: 22 },
  commandActions: { flexDirection: 'row', gap: 10 },
  // HEAD: gradient primary action (more polished than flat color)
  primaryAction: { flex: 1, borderRadius: 13, overflow: 'hidden' },
  primaryActionGrad: {
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
  secondaryAction: {
    flex: 1,
    backgroundColor: '#161628',
    borderRadius: 13,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d2d4e',
  },
  secondaryActionText: { fontSize: 14, fontWeight: '700', color: '#7c7caa' },

  metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  metric: {
    flex: 1,
    backgroundColor: '#0c0c1e',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1a1a36',
  },
  metricHighlight: { backgroundColor: '#130b24', borderColor: '#4c1d9544' },
  metricValue: { fontSize: 24, fontWeight: '900', color: '#f1f5f9', letterSpacing: -0.8 },
  metricValueHighlight: { color: '#a78bfa' },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#3d3d5c',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  missionCard: {
    backgroundColor: '#0c0c1e',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1a1a36',
  },
  missionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  missionBadge: {
    backgroundColor: '#130b24',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#4c1d9544',
  },
  missionBadgeText: { fontSize: 10, fontWeight: '800', color: '#818cf8', letterSpacing: 1.2 },
  missionTitle: { fontSize: 15, fontWeight: '800', color: '#e2e8f0' },
  missionSteps: { gap: 12 },
  missionStep: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  missionStepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#161628',
    borderWidth: 1.5,
    borderColor: '#2d2d4e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionStepDotDone: { backgroundColor: '#041f10', borderColor: '#145a30' },
  missionStepNum: { fontSize: 11, fontWeight: '800', color: '#3d3d5c' },
  missionStepCheck: { fontSize: 13, fontWeight: '800', color: '#4ade80' },
  missionStepText: { fontSize: 14, fontWeight: '400', color: '#7c7caa' },
  missionStepTextDone: { color: '#3d3d5c', textDecorationLine: 'line-through' },

  xpCard: {
    backgroundColor: '#0c0c1e',
    borderRadius: 18,
    padding: 18,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: '#1a1a36',
  },
  xpRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  levelBadge: {
    backgroundColor: '#130b24',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#4c1d9544',
  },
  levelText: { fontSize: 11, fontWeight: '800', color: '#818cf8', letterSpacing: 0.8 },
  xpLabel: { flex: 1, fontSize: 13, fontWeight: '800', color: '#7c7caa' },
  xpCount: { fontSize: 12, fontWeight: '700', color: '#3d3d5c' },
  xpTrack: {
    height: 7,
    backgroundColor: '#161628',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
  xpFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 4,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  xpGlowDot: {
    position: 'absolute',
    top: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#818cf8',
    marginLeft: -7,
    shadowColor: '#818cf8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  xpHint: { fontSize: 12, fontWeight: '400', color: '#3d3d5c', lineHeight: 17 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 19, fontWeight: '900', color: '#e2e8f0', letterSpacing: -0.4 },
  sectionAction: { fontSize: 12, fontWeight: '400', color: '#3d3d5c' },

  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  modeTileWrapper: { width: '47.5%' },
  modeTile: {
    backgroundColor: '#0c0c1e',
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  // Glow border overlay from HEAD (ui-revamp lacked this)
  modeTileGlowBorder: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 18,
    borderWidth: 1,
    zIndex: 1,
  },
  modeTileAccentBar: { height: 3, width: '100%' },
  modeTileGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  modeTileContent: { padding: 16, paddingTop: 14, gap: 2 },
  modeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  modeIconEmoji: { fontSize: 22 },
  modeLabel: { fontSize: 16, fontWeight: '900', color: '#e2e8f0', marginBottom: 5, letterSpacing: -0.3 },
  modeSub: { fontSize: 12, fontWeight: '400', color: '#475569', lineHeight: 16, marginBottom: 14 },
  // HEAD: pill-style start row (more polished than bare text)
  modeStartRow: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    alignItems: 'center',
  },
  modeStart: { fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },
});
