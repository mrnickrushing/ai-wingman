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
import { ConversationMode } from '../types';
import { useSessionStore } from '../store/sessionStore';
import { useWingmanSession } from '../hooks/useWingmanSession';
import { fetchMemoryBrief, type MemorySnapshot } from '../services/memory';
import { LiveSessionStatus } from '../components/LiveSessionStatus';
import { SessionTelemetry } from '../components/SessionTelemetry';
import { ConversationPrepBrief } from '../components/ConversationPrepBrief';
import { AudioWaveform } from '../components/AudioWaveform';

type RoleplayPreset = {
  mode: ConversationMode;
  title: string;
  scenario: string;
  goal: string;
  accent: string;
  context: string;
};

const PRESETS: Record<ConversationMode, RoleplayPreset> = {
  sales: {
    mode: 'sales',
    title: 'Sales objection drill',
    scenario: 'A prospect is pushing back on price and timing.',
    goal: 'Get to a clear next step without sounding pushy.',
    accent: '#6366f1',
    context: 'Sales roleplay. Handle objections, keep control, and ask for commitment.',
  },
  dating: {
    mode: 'dating',
    title: 'First date rehearsal',
    scenario: 'The conversation is moving well and you want to keep momentum.',
    goal: 'Stay present, build connection, and set up a second date naturally.',
    accent: '#ec4899',
    context: 'Dating roleplay. Keep the tone relaxed, warm, and specific.',
  },
  networking: {
    mode: 'networking',
    title: 'Networking intro',
    scenario: 'You just met someone useful at an event and want to leave with a clean follow-up.',
    goal: 'Make the exchange feel natural and leave with a next step.',
    accent: '#22d3ee',
    context: 'Networking roleplay. Keep it concise and useful.',
  },
  pitching: {
    mode: 'pitching',
    title: 'Pitch Q&A',
    scenario: 'An investor is asking hard questions about traction and market size.',
    goal: 'Answer crisply and defend the story without rambling.',
    accent: '#f59e0b',
    context: 'Pitch roleplay. Keep answers focused, confident, and metric-driven.',
  },
  hard_conversations: {
    mode: 'hard_conversations',
    title: 'Boundary rehearsal',
    scenario: 'You need to be direct without escalating the conversation.',
    goal: 'State the boundary clearly and keep the tone calm.',
    accent: '#8b5cf6',
    context: 'Hard conversation roleplay. Stay grounded, direct, and respectful.',
  },
};

type Turn = {
  id: string;
  speaker: 'You' | 'Claude';
  text: string;
  timestamp: number;
};

type Props = {
  onBack: () => void;
  mode: ConversationMode;
};

// Pulsing border ring used on the live coaching spotlight card
function PulsingBorder({ color, active }: { color: string; active: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (active) {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      loopRef.current.start();
    } else {
      loopRef.current?.stop();
      anim.setValue(0);
    }
    return () => loopRef.current?.stop();
  }, [active, anim]);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          borderRadius: 14,
          borderWidth: 2,
          borderColor: color,
          opacity,
        },
      ]}
    />
  );
}

export function RoleplayScreen({ onBack, mode }: Props) {
  const preset = PRESETS[mode] ?? PRESETS.sales;
  const [memory, setMemory] = useState<MemorySnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

  const { start, stop } = useWingmanSession();

  const {
    transcript,
    coachingHistory,
    currentCoaching,
    isConnected,
    isRecording,
    isWingmanSpeaking,
    error,
    sessionPhase,
    serverHealth,
    micPermissionGranted,
    micLevelDb,
  } = useSessionStore();

  // Slide-in animation for the coaching card
  const coachSlide = useRef(new Animated.Value(0)).current;
  const prevCoach = useRef<string | null>(null);

  useEffect(() => {
    if (currentCoaching && currentCoaching !== prevCoach.current) {
      prevCoach.current = currentCoaching;
      coachSlide.setValue(0);
      Animated.timing(coachSlide, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }).start();
    }
  }, [currentCoaching, coachSlide]);

  useEffect(() => {
    fetchMemoryBrief().then(setMemory).catch(() => setMemory(null));
  }, []);

  useEffect(() => {
    return () => { void stop(); };
  }, [stop]);

  const memoryContext = (() => {
    const items = [
      memory?.memory.interests?.length ? `Interests: ${memory.memory.interests.join('; ')}` : null,
      memory?.memory.personalDetails?.length ? `Personal details: ${memory.memory.personalDetails.join('; ')}` : null,
      memory?.memory.callbackTopics?.length ? `Callbacks: ${memory.memory.callbackTopics.join('; ')}` : null,
      memory?.brief?.nextMove ? `Next move: ${memory.brief.nextMove}` : null,
    ].filter(Boolean);
    return items.join('\n');
  })();

  const roleplayContext = [preset.context, memoryContext].filter(Boolean).join('\n');

  const conversationTurns: Turn[] = [
    ...transcript.map((item) => ({ id: `u-${item.id}`, speaker: 'You' as const, text: item.text, timestamp: item.timestamp })),
    ...coachingHistory.map((item) => ({ id: `c-${item.id}`, speaker: 'Claude' as const, text: item.text, timestamp: item.timestamp })),
  ].sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));

  const startRoleplay = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (started) {
        await stop();
        setStarted(false);
      }
      await start({
        mode,
        interactionMode: 'roleplay',
        keywords: mode === 'sales'
          ? ['objection', 'close', 'price', 'timing', 'next step']
          : mode === 'dating'
            ? ['date', 'vibe', 'callback', 'follow up']
            : mode === 'networking'
              ? ['follow up', 'contact', 'intro', 'event']
              : mode === 'pitching'
                ? ['traction', 'deck', 'question', 'metrics']
                : ['boundary', 'calm', 'direct', 'respect'],
        roleplayScenario: preset.scenario,
        roleplayGoal: preset.goal,
        roleplayContext,
        roleplayMemory: memory?.memory ?? { interests: [], personalDetails: [], callbackTopics: [] },
      });
      setStarted(true);
    } catch (err) {
      // surface via error state
    } finally {
      setLoading(false);
    }
  };

  const endRoleplay = async () => {
    await stop();
    setStarted(false);
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={['#090914', '#050510']} style={StyleSheet.absoluteFill} />
      {/* Ambient accent glow behind the screen when session active */}
      {started && (
        <View
          pointerEvents="none"
          style={[s.ambientGlow, { backgroundColor: `${preset.accent}09` }]}
        />
      )}
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={onBack} style={s.backBtn} hitSlop={10}>
            <Text style={s.backText}>Back</Text>
          </TouchableOpacity>
          <View style={s.headerCopy}>
            <Text style={s.title}>Practice with Claude</Text>
            <Text style={s.subtitle}>{preset.title}</Text>
          </View>
          <View style={s.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          {/* ── COACHING SPOTLIGHT — the immersive centerpiece ── */}
          {currentCoaching ? (
            <Animated.View
              style={[
                s.coachSpotlight,
                { borderColor: `${preset.accent}44` },
                {
                  opacity: coachSlide,
                  transform: [
                    {
                      translateY: coachSlide.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-10, 0],
                      }),
                    },
                    {
                      scale: coachSlide.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.97, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              {/* Pulsing border when Claude is speaking */}
              <PulsingBorder color={preset.accent} active={isWingmanSpeaking} />

              <LinearGradient
                colors={[`${preset.accent}22`, `${preset.accent}06`]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <View style={s.coachSpotlightInner}>
                <View style={s.coachSpotlightMeta}>
                  {isWingmanSpeaking ? (
                    <View style={s.speakingBadge}>
                      <View style={[s.speakingDot, { backgroundColor: preset.accent }]} />
                      <Text style={[s.speakingText, { color: preset.accent }]}>Claude speaking</Text>
                    </View>
                  ) : (
                    <Text style={[s.coachSpotlightLabel, { color: preset.accent }]}>LIVE CUE</Text>
                  )}
                </View>
                <Text style={s.coachSpotlightText}>{currentCoaching}</Text>
              </View>
            </Animated.View>
          ) : null}

          {/* ── Launch hero ── */}
          <View style={[s.hero, { borderLeftColor: preset.accent }]}>
            <Text style={s.heroBadge}>VOICE ROLEPLAY</Text>
            <Text style={s.heroTitle}>{preset.scenario}</Text>
            <Text style={s.heroBody}>{preset.goal}</Text>
            <View style={s.heroActions}>
              <TouchableOpacity
                onPress={started ? endRoleplay : startRoleplay}
                style={[s.primaryBtn, { backgroundColor: preset.accent }]}
                activeOpacity={0.82}
              >
                <Text style={s.primaryBtnText}>
                  {loading ? 'Starting…' : started ? 'End roleplay' : 'Start voice roleplay'}
                </Text>
              </TouchableOpacity>
              <View style={[s.heroPill, isRecording && s.heroPillActive]}>
                <View style={[s.heroPillDot, { backgroundColor: isRecording ? '#4ade80' : isConnected ? '#f59e0b' : '#475569' }]} />
                <Text style={[s.heroPillText, isRecording && { color: '#4ade80' }]}>
                  {started ? (isRecording ? 'Mic live' : 'Connected') : 'Tap to begin'}
                </Text>
              </View>
            </View>

            {started ? (
              <View style={s.micBar}>
                <AudioWaveform isActive={isRecording} color={preset.accent} height={28} barCount={20} />
                {isRecording && micLevelDb !== null ? (
                  <Text style={s.micDbText}>
                    {micLevelDb > -45 ? '🔊' : '🎙️'} {Math.round(micLevelDb)} dBFS
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>

          <ConversationPrepBrief
            compact
            label="ROLEPLAY BRIEF"
            mode={preset.mode}
            title={memory?.brief?.summary ?? preset.title}
            goal={preset.goal}
            context={roleplayContext}
          />

          {memory?.brief ? (
            <View style={s.memoryCard}>
              <Text style={s.sectionLabel}>MEMORY</Text>
              <Text style={s.memorySummary}>{memory.brief.summary}</Text>
              {memory.memory.interests?.length ? (
                <DetailList title="Interests" items={memory.memory.interests} />
              ) : null}
              {memory.memory.callbackTopics?.length ? (
                <DetailList title="Callbacks" items={memory.memory.callbackTopics} />
              ) : null}
            </View>
          ) : null}

          <LiveSessionStatus />
          <SessionTelemetry
            onRetry={startRoleplay}
            onReconnect={startRoleplay}
            onRestartMic={startRoleplay}
          />

          {/* ── Conversation log ── */}
          <View style={s.chatCard}>
            <View style={s.sectionRow}>
              <Text style={s.sectionLabel}>CONVERSATION</Text>
              <Text style={s.sectionMeta}>
                {sessionPhase === 'recording' || sessionPhase === 'streaming'
                  ? 'Live'
                  : started
                    ? 'Starting'
                    : 'Idle'}
              </Text>
            </View>
            {conversationTurns.length === 0 ? (
              <Text style={s.emptyText}>
                Start voice roleplay, then speak naturally. Claude will answer in your AirPods.
              </Text>
            ) : (
              conversationTurns.map((turn) => (
                <View
                  key={turn.id}
                  style={[
                    s.bubble,
                    turn.speaker === 'You' ? s.userBubble : s.claudeBubble,
                  ]}
                >
                  <Text style={s.speaker}>{turn.speaker}</Text>
                  <Text style={s.bubbleText}>{turn.text}</Text>
                </View>
              ))
            )}
          </View>

          {error ? (
            <View style={s.errorCard}>
              <Text style={s.errorTitle}>Roleplay error</Text>
              <Text style={s.errorText}>{error}</Text>
              <Text style={s.errorMeta}>
                Mic: {micPermissionGranted === true ? 'granted' : micPermissionGranted === false ? 'blocked' : 'unknown'}
                {' · '}
                Server: {serverHealth}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <View style={s.detailList}>
      <Text style={s.detailTitle}>{title}</Text>
      {items.map((item, i) => (
        <Text key={`${title}-${i}`} style={s.detailItem}>• {item}</Text>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050510' },
  safe: { flex: 1 },
  ambientGlow: {
    position: 'absolute',
    top: 0, right: 0, bottom: 0, left: 0,
  },
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
  headerCopy: { flex: 1, alignItems: 'center' },
  headerSpacer: { width: 64 },
  title: { color: '#f8fafc', fontSize: 18, fontWeight: '900' },
  subtitle: { color: '#94a3b8', fontSize: 12, marginTop: 2, textAlign: 'center' },
  content: { paddingHorizontal: 18, paddingBottom: 124, gap: 12 },

  // Coaching spotlight
  coachSpotlight: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  coachSpotlightInner: {
    padding: 20,
    gap: 12,
  },
  coachSpotlightMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coachSpotlightLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  speakingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  speakingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  speakingText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  coachSpotlightText: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 28,
    letterSpacing: -0.3,
  },

  // Hero
  hero: {
    backgroundColor: 'rgba(99,102,241,0.11)',
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.22)',
    borderRadius: 8,
    borderLeftWidth: 3,
    padding: 18,
    gap: 10,
  },
  heroBadge: { color: '#818cf8', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  heroTitle: { color: '#f8fafc', fontSize: 24, fontWeight: '900', lineHeight: 30 },
  heroBody: { color: '#cbd5e1', fontSize: 14, lineHeight: 21 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  primaryBtn: {
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  heroPillActive: {
    backgroundColor: 'rgba(74,222,128,0.1)',
    borderColor: 'rgba(74,222,128,0.28)',
  },
  heroPillDot: { width: 6, height: 6, borderRadius: 3 },
  heroPillText: { color: '#cbd5e1', fontSize: 11, fontWeight: '800' },
  micBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 4,
  },
  micDbText: { color: '#94a3b8', fontSize: 10, fontWeight: '600', minWidth: 72 },

  memoryCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 16,
    gap: 10,
  },
  sectionLabel: { color: '#818cf8', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  memorySummary: { color: '#cbd5e1', fontSize: 13, lineHeight: 20 },
  detailList: { gap: 4 },
  detailTitle: { color: '#e0e7ff', fontSize: 12, fontWeight: '900' },
  detailItem: { color: '#94a3b8', fontSize: 12, lineHeight: 18 },

  chatCard: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 16,
    gap: 10,
  },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionMeta: { color: '#64748b', fontSize: 11, fontWeight: '800' },
  emptyText: { color: '#94a3b8', fontSize: 13, lineHeight: 19 },
  bubble: {
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  userBubble: {
    backgroundColor: 'rgba(34,211,238,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.18)',
  },
  claudeBubble: {
    backgroundColor: 'rgba(129,140,248,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.18)',
  },
  speaker: { color: '#f8fafc', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  bubbleText: { color: '#cbd5e1', fontSize: 14, lineHeight: 20 },
  errorCard: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.22)',
    borderRadius: 8,
    padding: 16,
    gap: 6,
  },
  errorTitle: { color: '#fecaca', fontSize: 14, fontWeight: '900' },
  errorText: { color: '#fee2e2', fontSize: 13, lineHeight: 19 },
  errorMeta: { color: '#fca5a5', fontSize: 11, fontWeight: '800' },
});
