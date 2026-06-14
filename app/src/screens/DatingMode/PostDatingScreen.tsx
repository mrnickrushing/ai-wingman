import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Animated, ActivityIndicator, Linking, Share,
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
import { scheduleFollowUps } from '../../utils/followUpScheduler';

// Strip wrapping quotes the AI sometimes adds around message text.
function cleanText(raw: string): string {
  return raw.replace(/^["'"']+|["'"']+$/gu, '').trim();
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

interface Props {
  onNewSession: () => void;
  onHome: () => void;
}

export function PostDatingScreen({ onNewSession, onHome }: Props) {
  const { elapsedSeconds, wordsSelf, coachingHistory, transcript, datingSetup, lastRating, recordSession } = useSessionStore();
  const [analysis, setAnalysis] = useState<SessionAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const fullTranscriptText = transcript
    .filter((t) => t.isFinal)
    .map((t) => t.text)
    .join(' ')
    .trim();

  useEffect(() => {
    const score = computeWingmanScore({
      coachingTipsTaken: coachingHistory.length,
      elapsedSeconds,
      wordsSelf,
      rating: lastRating,
    });
    recordSession(score);
    recordSessionStats(score);
    saveSession({
      mode: 'dating',
      title: datingSetup.name || 'Date',
      durationSeconds: elapsedSeconds,
      wordsSpoken: wordsSelf,
      coachingCount: coachingHistory.length,
      score,
      rating: lastRating,
      transcriptText: fullTranscriptText,
      coachingItems: coachingHistory.map((c) => c.text),
      context: {
        'Date name': datingSetup.name,
        'Intent': datingSetup.intent,
      },
    }).then((s) => {
      setAnalysis(s?.analysis ?? null);
      setAnalysisLoading(false);
      resetInactivityNudge().catch(() => {});
      const recap = createSessionRecap({
        mode: 'dating',
        title: 'Dating recap',
        subtitle: datingSetup.name || 'Dating session',
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
      });
      void saveSessionRecap(recap).then(() => {
        void scheduleFollowUps(recap.followUps, {
          title: recap.title,
          identifierPrefix: `wingman-follow-${recap.id}`,
        });
      });
    });
  }, []);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const statAnims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  useEffect(() => {
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
    .map((t) => t.text)
    .join(' ')
    .trim();
  const vibe = transcriptSummary.length > 180 ? '🔥 Hot' : transcriptSummary.length > 80 ? '✨ Warm' : '🌙 Quiet';
  const intentReady = Boolean(datingSetup.intent);
  const nameReady = Boolean(datingSetup.name);
  const momentumWeight = transcriptSummary.length > 180 ? 88 : transcriptSummary.length > 80 ? 68 : 42;

  return (
    <View style={s.root}>
      <LinearGradient colors={['#1a0c1e', '#050510']} style={StyleSheet.absoluteFill} />
      <View style={s.topGlow} />

      <SafeAreaView style={s.safe}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
          <Animated.View style={[s.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={s.checkmark}>♥</Text>
            <Text style={s.title}>Date Recap</Text>
            <Text style={s.prospectLabel}>{datingSetup.name || 'Session ended'}</Text>
          </Animated.View>

          <WingmanScore
            coachingHistory={coachingHistory}
            elapsedSeconds={elapsedSeconds}
            wordsSelf={wordsSelf}
            rating={lastRating}
          />

          <SessionScorecard
            title="Date scorecard"
            accent="#ec4899"
            subtitle="Intent, momentum, and conversation texture."
            metrics={[
              { label: 'Intent', value: intentReady ? 'Clear' : 'Soft', detail: intentReady ? 'You had a stated reason to be there.' : 'State the outcome you want before starting.', weight: intentReady ? 88 : 46 },
              { label: 'Momentum', value: vibe.replace('🔥 ', '').replace('❄️ ', '').replace('✨ ', ''), detail: transcriptSummary ? 'Conversation produced enough material for review.' : 'Capture more dialogue next time.', weight: momentumWeight },
              { label: 'Profile', value: nameReady ? 'Named' : 'Unnamed', detail: nameReady ? 'The session had a defined person/context.' : 'Add a name so the recap stays grounded.', weight: nameReady ? 82 : 40 },
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
              <Text style={s.sectionLabel}>FULL TRANSCRIPT</Text>
              <View style={s.summaryCard}>
                <Text style={s.summaryText} numberOfLines={12}>{transcriptSummary}</Text>
              </View>
            </Animated.View>
          )}

          {coachingHistory.length > 0 && (
            <Animated.View style={[s.section, { opacity: fadeAnim }]}>
              <Text style={s.sectionLabel}>ATTRACTION SIGNALS</Text>
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
                <ActivityIndicator size="small" color="#ec4899" />
                <Text style={s.analysisLoadingText}>Analyzing your date...</Text>
              </View>
            ) : analysis ? (
              <View style={s.analysisCard}>
                <Text style={s.analysisSummary}>{analysis.summary}</Text>
                {analysis.strengths.length > 0 && (
                  <View style={s.analysisList}>
                    <Text style={s.analysisListHeader}>✓ What worked</Text>
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
              </View>
            ) : null}
          </Animated.View>

          {(analysisLoading || analysis?.secondDatePrep) && (
            <Animated.View style={[s.section, { opacity: fadeAnim }]}>
              <Text style={s.sectionLabel}>SECOND DATE PREP</Text>
              {analysisLoading ? (
                <View style={s.analysisLoading}>
                  <ActivityIndicator size="small" color="#ec4899" />
                  <Text style={s.analysisLoadingText}>Building next-date prep...</Text>
                </View>
              ) : analysis?.secondDatePrep ? (
                <View style={s.prepCard}>
                  {analysis.secondDatePrep.nextDateIdea ? (
                    <View style={s.nextDateIdea}>
                      <Text style={s.nextDateLabel}>Next date idea</Text>
                      <Text style={s.nextDateText}>{analysis.secondDatePrep.nextDateIdea}</Text>
                    </View>
                  ) : null}
                  {(analysis.secondDatePrep.recommendations?.length ?? 0) > 0 && (
                    <View style={s.analysisList}>
                      <Text style={s.analysisListHeader}>Do this next</Text>
                      {analysis.secondDatePrep.recommendations.map((item, i) => (
                        <Text key={i} style={s.analysisItem}>· {item}</Text>
                      ))}
                    </View>
                  )}
                  {(analysis.secondDatePrep.conversationStarters?.length ?? 0) > 0 && (
                    <View style={s.analysisList}>
                      <Text style={s.analysisListHeader}>Callbacks to use</Text>
                      {analysis.secondDatePrep.conversationStarters.map((item, i) => (
                        <Text key={i} style={s.analysisItem}>· {item}</Text>
                      ))}
                    </View>
                  )}
                  {(analysis.secondDatePrep.remember?.length ?? 0) > 0 && (
                    <View style={s.analysisList}>
                      <Text style={s.analysisListHeader}>Remember</Text>
                      {analysis.secondDatePrep.remember.map((item, i) => (
                        <Text key={i} style={s.analysisItem}>· {item}</Text>
                      ))}
                    </View>
                  )}
                </View>
              ) : null}
            </Animated.View>
          )}

          {(analysisLoading || (analysis?.followUps && analysis.followUps.length > 0)) && (
            <Animated.View style={[s.section, { opacity: fadeAnim }]}>
              <Text style={s.sectionLabel}>FOLLOW-UP TEXTS</Text>
              {analysisLoading ? (
                <View style={s.analysisLoading}>
                  <ActivityIndicator size="small" color="#ec4899" />
                </View>
              ) : (
                <View style={s.coachingList}>
                  {(analysis?.followUps ?? []).map((f, i) => (
                    <View key={i} style={s.followCard}>
                      <View style={s.timingPill}>
                        <Text style={s.timingText}>{f.timing}</Text>
                      </View>
                      <Text style={s.followText}>{f.text}</Text>
                      <TouchableOpacity
                        style={s.sendBtn}
                        activeOpacity={0.75}
                        onPress={() => Linking.openURL('sms:&body=' + encodeURIComponent(cleanText(f.text))).catch(() => {})}
                      >
                        <Text style={s.sendBtnText}>Send it →</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </Animated.View>
          )}

          {analysis?.memory && (
            <Animated.View style={[s.section, { opacity: fadeAnim }]}>
              <Text style={s.sectionLabel}>DATE MEMORY</Text>
              <View style={s.analysisCard}>
                {(analysis.memory.interests?.length ?? 0) > 0 && (
                  <View style={s.analysisList}>
                    <Text style={s.analysisListHeader}>Interests</Text>
                    {analysis.memory.interests.map((item, i) => (
                      <Text key={i} style={s.analysisItem}>· {item}</Text>
                    ))}
                  </View>
                )}
                {(analysis.memory.personalDetails?.length ?? 0) > 0 && (
                  <View style={s.analysisList}>
                    <Text style={s.analysisListHeader}>Personal details</Text>
                    {analysis.memory.personalDetails.map((item, i) => (
                      <Text key={i} style={s.analysisItem}>· {item}</Text>
                    ))}
                  </View>
                )}
                {(analysis.memory.callbackTopics?.length ?? 0) > 0 && (
                  <View style={s.analysisList}>
                    <Text style={s.analysisListHeader}>Callbacks</Text>
                    {analysis.memory.callbackTopics.map((item, i) => (
                      <Text key={i} style={s.analysisItem}>· {item}</Text>
                    ))}
                  </View>
                )}
              </View>
            </Animated.View>
          )}

          <Animated.View style={[s.actions, { opacity: fadeAnim }]}>
            <TouchableOpacity onPress={onNewSession} style={s.secondaryBtn} activeOpacity={0.8}>
              <LinearGradient
                colors={['rgba(236,72,153,0.2)', 'rgba(244,63,94,0.1)']}
                style={s.secondaryGrad}
              >
                <Text style={s.secondaryText}>💘 New Session</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={onHome} style={s.primaryBtn} activeOpacity={0.8}>
              <LinearGradient
                colors={['#ec4899', '#f43f5e']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.primaryGrad}
              >
                <Text style={s.primaryText}>Home →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
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
    backgroundColor: 'rgba(236,72,153,0.07)',
  },
  content: { paddingHorizontal: 22, paddingTop: 40, paddingBottom: 48, gap: 28 },

  header: { alignItems: 'center', gap: 8 },
  checkmark: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(236,72,153,0.15)',
    borderWidth: 2, borderColor: 'rgba(236,72,153,0.35)',
    textAlign: 'center', lineHeight: 60,
    color: '#ec4899', fontSize: 26, fontWeight: '800',
    overflow: 'hidden',
  },
  title: { color: '#f1f5f9', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  prospectLabel: { color: '#64748b', fontSize: 13 },

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

  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, padding: 16,
  },
  summaryText: { color: '#cbd5e1', fontSize: 14, lineHeight: 21 },

  coachingList: { gap: 8 },
  coachingItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: 'rgba(236,72,153,0.06)',
    borderWidth: 1, borderColor: 'rgba(236,72,153,0.15)',
    borderRadius: 12, padding: 14,
  },
  coachingBullet: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#ec4899', marginTop: 6, flexShrink: 0,
  },
  coachingText: { flex: 1, color: '#cbd5e1', fontSize: 14, lineHeight: 21 },

  analysisLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  analysisLoadingText: { color: '#475569', fontSize: 13 },
  analysisCard: {
    backgroundColor: 'rgba(236,72,153,0.06)',
    borderWidth: 1, borderColor: 'rgba(236,72,153,0.15)',
    borderRadius: 16, padding: 16, gap: 12,
  },
  analysisSummary: { color: '#cbd5e1', fontSize: 14, lineHeight: 21 },
  analysisList: { gap: 4 },
  analysisListHeader: { color: '#ec4899', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
  analysisItem: { color: '#94a3b8', fontSize: 13, lineHeight: 20 },
  analysisKeyMoment: { color: '#64748b', fontSize: 12, fontStyle: 'italic', lineHeight: 18 },
  prepCard: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1, borderColor: 'rgba(236,72,153,0.18)',
    borderRadius: 16, padding: 16, gap: 14,
  },
  nextDateIdea: {
    backgroundColor: 'rgba(236,72,153,0.08)',
    borderWidth: 1, borderColor: 'rgba(236,72,153,0.18)',
    borderRadius: 12, padding: 13, gap: 5,
  },
  nextDateLabel: { color: '#ec4899', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  nextDateText: { color: '#f8fafc', fontSize: 14, lineHeight: 20, fontWeight: '700' },

  followCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, padding: 14, gap: 8,
  },
  timingPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(236,72,153,0.15)',
    borderWidth: 1, borderColor: 'rgba(236,72,153,0.3)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  timingText: { color: '#ec4899', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  followText: { color: '#cbd5e1', fontSize: 14, lineHeight: 21 },
  sendBtn: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(236,72,153,0.15)',
    borderWidth: 1, borderColor: 'rgba(236,72,153,0.35)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7,
  },
  sendBtnText: { color: '#ec4899', fontSize: 13, fontWeight: '700' },

  actions: { flexDirection: 'row', gap: 12 },
  secondaryBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  secondaryGrad: {
    paddingVertical: 16, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(236,72,153,0.25)', borderRadius: 14,
  },
  secondaryText: { color: '#ec4899', fontSize: 15, fontWeight: '700' },
  primaryBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  primaryGrad: { paddingVertical: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
