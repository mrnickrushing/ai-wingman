import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Animated, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSessionStore } from '../../store/sessionStore';
import { WingmanScore } from '../../components/WingmanScore';
import { SessionScorecard } from '../../components/SessionScorecard';
import { computeWingmanScore } from '../../utils/scoring';
import { recordSessionStats } from '../../utils/statsStorage';
import { saveSession, SessionAnalysis } from '../../services/sessionService';
import { resetInactivityNudge } from '../../hooks/useNotifications';
import {
  buildHighlights,
  buildSessionSummary,
  createSessionRecap,
  saveSessionRecap,
} from '../../utils/sessionArchive';

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

type Outcome = 'yes' | 'partially' | 'no';

const OUTCOMES: { id: Outcome; label: string }[] = [
  { id: 'yes', label: 'Yes' },
  { id: 'partially', label: 'Partially' },
  { id: 'no', label: 'No' },
];

interface Props {
  onNewSession: () => void;
  onHome: () => void;
}

export function PostHardConversationScreen({ onNewSession, onHome }: Props) {
  const { elapsedSeconds, wordsSelf, coachingHistory, transcript, hardConvoSetup, lastRating, recordSession } = useSessionStore();

  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [finalNumber, setFinalNumber] = useState('');
  const [therapyNotes, setTherapyNotes] = useState('');
  const [analysis, setAnalysis] = useState<SessionAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const statAnims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const score = computeWingmanScore({
      coachingTipsTaken: coachingHistory.length,
      elapsedSeconds,
      wordsSelf,
      rating: lastRating,
    });
    recordSession(score);
    recordSessionStats(score);
    const transcriptText = transcript.filter((t) => t.isFinal).map((t) => t.text).join(' ');
    saveSession({
      mode: 'hard_conversations',
      title: hardConvoSetup.situation || (hardConvoSetup.scenario ?? 'Conversation'),
      durationSeconds: elapsedSeconds,
      wordsSpoken: wordsSelf,
      coachingCount: coachingHistory.length,
      score,
      rating: lastRating,
      transcriptText,
      coachingItems: coachingHistory.map((c) => c.text),
      context: {
        'Scenario': hardConvoSetup.scenario ?? '',
        'Situation': hardConvoSetup.situation,
        'Goal': hardConvoSetup.goal,
      },
    }).then((s) => {
      setAnalysis(s?.analysis ?? null);
      setAnalysisLoading(false);
      resetInactivityNudge().catch(() => {});
      void saveSessionRecap(
        createSessionRecap({
          mode: 'hard_conversations',
          title: 'Conversation recap',
          subtitle: hardConvoSetup.scenario ? hardConvoSetup.situation || 'Hard conversation' : 'Hard conversation',
          score,
          durationSeconds: elapsedSeconds,
          coachingTips: coachingHistory.length,
          wordsSelf,
          rating: lastRating,
          summary: s?.analysis?.summary ?? buildSessionSummary(transcript, coachingHistory),
          highlights: buildHighlights(coachingHistory),
          strengths: s?.analysis?.strengths,
          improvements: s?.analysis?.improvements,
          keyMoment: s?.analysis?.keyMoment,
          followUps: s?.analysis?.followUps,
        })
      );
    });
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
    statAnims.forEach((a, i) => {
      Animated.spring(a, {
        toValue: 1, delay: 200 + i * 100,
        tension: 60, friction: 9, useNativeDriver: true,
      }).start();
    });
  }, []);

  const stats = [
    { value: formatDuration(elapsedSeconds), label: 'Duration', icon: '⏱' },
    { value: coachingHistory.length.toString(), label: 'Wingman tips', icon: '💡' },
    { value: wordsSelf.toString(), label: 'Words spoken', icon: '🎙' },
  ];

  const transcriptSummary = transcript
    .filter((t) => t.isFinal)
    .slice(-6)
    .map((t) => t.text)
    .join(' ');

  const isSalary = hardConvoSetup.scenario === 'salary_negotiation';
  const isTherapy = hardConvoSetup.scenario === 'therapy';
  const goalReady = Boolean(hardConvoSetup.goal);
  const outcomeReady = Boolean(outcome);
  const notesReady = Boolean(therapyNotes.trim() || finalNumber.trim());

  return (
    <View style={s.root}>
      <LinearGradient colors={['#160c22', '#050510']} style={StyleSheet.absoluteFill} />
      <View style={s.topGlow} />

      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.content}
          >
            <Animated.View style={[s.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <Text style={s.checkmark}>🔥</Text>
              <Text style={s.title}>Conversation Recap</Text>
              <Text style={s.prospectLabel}>{hardConvoSetup.situation || 'Session ended'}</Text>
            </Animated.View>

          <WingmanScore
            coachingHistory={coachingHistory}
            elapsedSeconds={elapsedSeconds}
            wordsSelf={wordsSelf}
            rating={lastRating}
          />

          <SessionScorecard
            title="Conversation scorecard"
            accent="#8b5cf6"
            subtitle="Outcome, clarity, and follow-through."
            metrics={[
              { label: 'Goal', value: goalReady ? 'Set' : 'Missing', detail: goalReady ? 'You had a specific outcome to aim at.' : 'State the goal before the next hard talk.', weight: goalReady ? 90 : 42 },
              { label: 'Outcome', value: outcomeReady ? (outcome === 'yes' ? 'Won' : outcome === 'partially' ? 'Partial' : 'Not yet') : 'Unrated', detail: outcomeReady ? 'You made a clear judgment about the result.' : 'Pick the result to anchor the recap.', weight: outcomeReady ? 84 : 34 },
              { label: 'Notes', value: notesReady ? 'Captured' : 'Sparse', detail: notesReady ? 'You saved concrete follow-up details.' : 'Add salary/therapy notes to keep the next step grounded.', weight: notesReady ? 78 : 36 },
            ]}
          />

          <View style={s.statsRow}>
              {stats.map((stat, i) => (
                <Animated.View
                  key={i}
                  style={[s.statCard, {
                    opacity: statAnims[i],
                    transform: [{ translateY: statAnims[i].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                  }]}
                >
                  <Text style={s.statIcon}>{stat.icon}</Text>
                  <Text style={s.statValue}>{stat.value}</Text>
                  <Text style={s.statLabel}>{stat.label}</Text>
                </Animated.View>
              ))}
            </View>

            {transcriptSummary.length > 0 && (
              <Animated.View style={[s.section, { opacity: fadeAnim }]}>
                <Text style={s.sectionLabel}>WHAT WAS SAID</Text>
                <View style={s.summaryCard}>
                  <Text style={s.summaryText} numberOfLines={6}>{transcriptSummary}</Text>
                </View>
              </Animated.View>
            )}

            <Animated.View style={[s.section, { opacity: fadeAnim }]}>
              <Text style={s.sectionLabel}>DID YOU GET WHAT YOU WANTED?</Text>
              <View style={s.outcomeRow}>
                {OUTCOMES.map((o) => {
                  const active = outcome === o.id;
                  return (
                    <TouchableOpacity
                      key={o.id}
                      onPress={() => setOutcome(o.id)}
                      activeOpacity={0.8}
                      style={[s.outcomeChip, active && s.outcomeChipActive]}
                    >
                      <Text style={[s.outcomeText, active && s.outcomeTextActive]}>{o.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>

            {isSalary && (
              <Animated.View style={[s.section, { opacity: fadeAnim }]}>
                <Text style={s.sectionLabel}>FINAL NUMBER vs. GOAL</Text>
                <View style={s.inputCard}>
                  {hardConvoSetup.goal ? (
                    <Text style={s.inputCardGoal}>Goal: {hardConvoSetup.goal}</Text>
                  ) : null}
                  <TextInput
                    style={s.input}
                    placeholder="What did you land? e.g. $18k increase"
                    placeholderTextColor="#334155"
                    value={finalNumber}
                    onChangeText={setFinalNumber}
                  />
                </View>
              </Animated.View>
            )}

            {isTherapy && (
              <Animated.View style={[s.section, { opacity: fadeAnim }]}>
                <Text style={s.sectionLabel}>NOTES FOR YOUR THERAPIST</Text>
                <View style={s.inputCard}>
                  <TextInput
                    style={[s.input, s.inputMultiline]}
                    placeholder="Key topics surfaced and themes to raise..."
                    placeholderTextColor="#334155"
                    value={therapyNotes}
                    onChangeText={setTherapyNotes}
                    multiline
                  />
                </View>
              </Animated.View>
            )}

            {coachingHistory.length > 0 && (
              <Animated.View style={[s.section, { opacity: fadeAnim }]}>
                <Text style={s.sectionLabel}>KEY MOMENTS</Text>
                <View style={s.coachingList}>
                  {coachingHistory.slice(-5).reverse().map((entry) => (
                    <View key={entry.id} style={s.coachingItem}>
                      <View style={s.coachingBullet} />
                      <Text style={s.coachingText}>{entry.text}</Text>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}

            <Animated.View style={[s.section, { opacity: fadeAnim }]}>
              <Text style={s.sectionLabel}>WINGMAN ANALYSIS</Text>
              {analysisLoading ? (
                <View style={s.analysisLoading}>
                  <ActivityIndicator size="small" color="#8b5cf6" />
                  <Text style={s.analysisLoadingText}>Analyzing your conversation...</Text>
                </View>
              ) : analysis ? (
                <View style={s.analysisCard}>
                  <Text style={s.analysisSummary}>{analysis.summary}</Text>
                  {analysis.strengths.length > 0 && (
                    <View style={s.analysisList}>
                      <Text style={s.analysisListHeader}>✓ What went well</Text>
                      {analysis.strengths.map((s2, i) => (
                        <Text key={i} style={s.analysisItem}>· {s2}</Text>
                      ))}
                    </View>
                  )}
                  {analysis.improvements.length > 0 && (
                    <View style={s.analysisList}>
                      <Text style={s.analysisListHeader}>↑ Next time</Text>
                      {analysis.improvements.map((s2, i) => (
                        <Text key={i} style={s.analysisItem}>· {s2}</Text>
                      ))}
                    </View>
                  )}
                  {analysis.keyMoment ? (
                    <Text style={s.analysisKeyMoment}>Key moment: {analysis.keyMoment}</Text>
                  ) : null}
                  {analysis.followUps && analysis.followUps.length > 0 && (
                    <View style={s.analysisList}>
                      <Text style={s.analysisListHeader}>→ Next steps</Text>
                      {analysis.followUps.map((f, i) => (
                        <Text key={i} style={s.analysisItem}>· [{f.timing}] {f.text}</Text>
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <View style={s.summaryCard}>
                  <Text style={s.summaryText}>
                    {coachingHistory.length > 0
                      ? 'What worked: you stayed in the conversation and used live cues. Next time, hold silence longer and let the other side fill it.'
                      : 'Not enough signal captured this session — keep the conversation flowing next time to surface clearer lessons.'}
                  </Text>
                </View>
              )}
            </Animated.View>

            <Animated.View style={[s.actions, { opacity: fadeAnim }]}>
              <TouchableOpacity onPress={onNewSession} style={s.secondaryBtn} activeOpacity={0.8}>
                <LinearGradient
                  colors={['rgba(139,92,246,0.2)', 'rgba(124,58,237,0.1)']}
                  style={s.secondaryGrad}
                >
                  <Text style={s.secondaryText}>🔥 New Session</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={onHome} style={s.primaryBtn} activeOpacity={0.8}>
                <LinearGradient
                  colors={['#8b5cf6', '#7c3aed']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.primaryGrad}
                >
                  <Text style={s.primaryText}>Home →</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050510' },
  safe: { flex: 1 },
  topGlow: {
    position: 'absolute', width: 300, height: 300,
    borderRadius: 150, top: -100, alignSelf: 'center',
    backgroundColor: 'rgba(139,92,246,0.07)',
  },
  content: { paddingHorizontal: 22, paddingTop: 40, paddingBottom: 48, gap: 28 },

  header: { alignItems: 'center', gap: 8 },
  checkmark: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderWidth: 2, borderColor: 'rgba(139,92,246,0.35)',
    textAlign: 'center', lineHeight: 60,
    fontSize: 26,
    overflow: 'hidden',
  },
  title: { color: '#f1f5f9', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  prospectLabel: { color: '#64748b', fontSize: 13, textAlign: 'center' },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, padding: 16, alignItems: 'center', gap: 4,
  },
  statIcon: { fontSize: 22 },
  statValue: { color: '#f1f5f9', fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  statLabel: { color: '#475569', fontSize: 10, fontWeight: '600', textAlign: 'center' },

  section: { gap: 12 },
  sectionLabel: { color: '#334155', fontSize: 10, fontWeight: '700', letterSpacing: 2 },

  analysisLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  analysisLoadingText: { color: '#475569', fontSize: 13 },
  analysisCard: {
    backgroundColor: 'rgba(139,92,246,0.06)',
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.15)',
    borderRadius: 16, padding: 16, gap: 12,
  },
  analysisSummary: { color: '#cbd5e1', fontSize: 14, lineHeight: 21 },
  analysisList: { gap: 4 },
  analysisListHeader: { color: '#8b5cf6', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
  analysisItem: { color: '#94a3b8', fontSize: 13, lineHeight: 20 },
  analysisKeyMoment: { color: '#64748b', fontSize: 12, fontStyle: 'italic', lineHeight: 18 },

  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, padding: 16,
  },
  summaryText: { color: '#cbd5e1', fontSize: 14, lineHeight: 21 },

  outcomeRow: { flexDirection: 'row', gap: 10 },
  outcomeChip: {
    flex: 1, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12, paddingVertical: 14,
  },
  outcomeChipActive: {
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderColor: 'rgba(139,92,246,0.5)',
  },
  outcomeText: { color: '#64748b', fontSize: 14, fontWeight: '700' },
  outcomeTextActive: { color: '#8b5cf6' },

  inputCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, padding: 14, gap: 10,
  },
  inputCardGoal: { color: '#8b5cf6', fontSize: 12, fontWeight: '600' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    color: '#f1f5f9', fontSize: 15,
  },
  inputMultiline: { minHeight: 90, textAlignVertical: 'top' },

  coachingList: { gap: 8 },
  coachingItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: 'rgba(139,92,246,0.06)',
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.15)',
    borderRadius: 12, padding: 14,
  },
  coachingBullet: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#8b5cf6', marginTop: 6, flexShrink: 0,
  },
  coachingText: { flex: 1, color: '#cbd5e1', fontSize: 14, lineHeight: 21 },

  actions: { flexDirection: 'row', gap: 12 },
  secondaryBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  secondaryGrad: {
    paddingVertical: 16, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)', borderRadius: 14,
  },
  secondaryText: { color: '#8b5cf6', fontSize: 15, fontWeight: '700' },
  primaryBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  primaryGrad: { paddingVertical: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
