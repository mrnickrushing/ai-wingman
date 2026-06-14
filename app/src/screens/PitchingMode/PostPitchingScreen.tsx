import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Animated, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSessionStore } from '../../store/sessionStore';
import { WingmanScore } from '../../components/WingmanScore';
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

interface Props {
  onNewSession: () => void;
  onHome: () => void;
}

export function PostPitchingScreen({ onNewSession, onHome }: Props) {
  const { elapsedSeconds, wordsSelf, coachingHistory, pitchingSetup, lastRating, recordSession } = useSessionStore();
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
    saveSession({
      mode: 'pitching',
      title: pitchingSetup.title || 'Pitch',
      durationSeconds: elapsedSeconds,
      wordsSpoken: wordsSelf,
      coachingCount: coachingHistory.length,
      score,
      rating: lastRating,
      transcriptText: '',
      coachingItems: coachingHistory.map((c) => c.text),
      context: {
        'Pitch title': pitchingSetup.title,
        'Audience': pitchingSetup.audience,
        'Key points': pitchingSetup.deck,
      },
    }).then((s) => {
      setAnalysis(s?.analysis ?? null);
      setAnalysisLoading(false);
      resetInactivityNudge().catch(() => {});
      void saveSessionRecap(
        createSessionRecap({
          mode: 'pitching',
          title: 'Pitch recap',
          subtitle: pitchingSetup.title || 'Pitch session',
          score,
          durationSeconds: elapsedSeconds,
          coachingTips: coachingHistory.length,
          wordsSelf,
          rating: lastRating,
          summary: s?.analysis?.summary ?? buildSessionSummary([], coachingHistory),
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

  const minutes = elapsedSeconds / 60;
  const wpm = minutes > 0 ? Math.round(wordsSelf / minutes) : 0;
  const paceColor = wpm > 160 ? '#f43f5e' : wpm > 130 ? '#f59e0b' : '#4ade80';
  const paceLabel = wpm > 160
    ? 'Rushed — slow down for emphasis'
    : wpm > 130
    ? 'Slightly fast — add deliberate pauses'
    : 'Well-paced delivery';

  const stats = [
    { value: formatDuration(elapsedSeconds), label: 'Duration', icon: '⏱' },
    { value: coachingHistory.length.toString(), label: 'Coaching cues', icon: '💡' },
    { value: wpm.toString(), label: 'Words/min', icon: '🎙' },
  ];


  return (
    <View style={s.root}>
      <LinearGradient colors={['#1c1305', '#050510']} style={StyleSheet.absoluteFill} />
      <View style={s.topGlow} />

      <SafeAreaView style={s.safe}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
          <Animated.View style={[s.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={s.checkmark}>✓</Text>
            <Text style={s.title}>Pitch Recap</Text>
            <Text style={s.prospectLabel}>{pitchingSetup.title || 'Session ended'}</Text>
          </Animated.View>

          <WingmanScore
            coachingHistory={coachingHistory}
            elapsedSeconds={elapsedSeconds}
            wordsSelf={wordsSelf}
            rating={lastRating}
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

          {elapsedSeconds > 10 && wordsSelf > 0 && (
            <Animated.View style={[s.feedbackCard, { opacity: fadeAnim }]}>
              <Text style={s.sectionLabel}>TIME MANAGEMENT</Text>
              <View style={s.feedbackRow}>
                <View style={[s.feedbackDot, { backgroundColor: paceColor }]} />
                <Text style={s.feedbackText}>{paceLabel}</Text>
              </View>
              <View style={s.ratioBar}>
                <View style={[s.ratioFill, { width: `${Math.min(100, (wpm / 220) * 100)}%`, backgroundColor: paceColor }]} />
              </View>
            </Animated.View>
          )}

          {coachingHistory.length > 0 && (
            <Animated.View style={[s.section, { opacity: fadeAnim }]}>
              <Text style={s.sectionLabel}>KEY MOMENTS & Q&A</Text>
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
                <ActivityIndicator size="small" color="#f59e0b" />
                <Text style={s.analysisLoadingText}>Analyzing your pitch...</Text>
              </View>
            ) : analysis ? (
              <View style={s.analysisCard}>
                <Text style={s.analysisSummary}>{analysis.summary}</Text>
                {analysis.strengths.length > 0 && (
                  <View style={s.analysisList}>
                    <Text style={s.analysisListHeader}>✓ What landed</Text>
                    {analysis.strengths.map((s2, i) => (
                      <Text key={i} style={s.analysisItem}>· {s2}</Text>
                    ))}
                  </View>
                )}
                {analysis.improvements.length > 0 && (
                  <View style={s.analysisList}>
                    <Text style={s.analysisListHeader}>↑ Improvements</Text>
                    {analysis.improvements.map((s2, i) => (
                      <View key={i} style={s.improveItem}>
                        <Text style={s.improveNum}>{i + 1}</Text>
                        <Text style={s.improveText}>{s2}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {analysis.keyMoment ? (
                  <Text style={s.analysisKeyMoment}>Key moment: {analysis.keyMoment}</Text>
                ) : null}
              </View>
            ) : (
              <View style={s.summaryCard}>
                <Text style={s.summaryText}>
                  {pitchingSetup.deck.trim()
                    ? 'Sections moved fast relative to your outline — make sure each deck point got airtime, especially traction and the ask.'
                    : 'No deck provided, so weak-point analysis is limited. Add your structure next time for section-by-section feedback.'}
                </Text>
              </View>
            )}
          </Animated.View>

          <Animated.View style={[s.actions, { opacity: fadeAnim }]}>
            <TouchableOpacity onPress={onNewSession} style={s.secondaryBtn} activeOpacity={0.8}>
              <LinearGradient
                colors={['rgba(245,158,11,0.2)', 'rgba(217,119,6,0.1)']}
                style={s.secondaryGrad}
              >
                <Text style={s.secondaryText}>🚀 New Session</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={onHome} style={s.primaryBtn} activeOpacity={0.8}>
              <LinearGradient
                colors={['#f59e0b', '#d97706']}
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
    backgroundColor: 'rgba(245,158,11,0.07)',
  },
  content: { paddingHorizontal: 22, paddingTop: 40, paddingBottom: 48, gap: 28 },

  header: { alignItems: 'center', gap: 8 },
  checkmark: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderWidth: 2, borderColor: 'rgba(245,158,11,0.35)',
    textAlign: 'center', lineHeight: 60,
    color: '#f59e0b', fontSize: 26, fontWeight: '800',
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

  feedbackCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, padding: 18, gap: 12,
  },
  feedbackRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  feedbackDot: { width: 8, height: 8, borderRadius: 4 },
  feedbackText: { color: '#f1f5f9', fontSize: 14, fontWeight: '600' },
  ratioBar: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3, overflow: 'hidden',
  },
  ratioFill: { height: '100%', borderRadius: 3 },

  section: { gap: 12 },
  sectionLabel: { color: '#334155', fontSize: 10, fontWeight: '700', letterSpacing: 2 },

  analysisLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  analysisLoadingText: { color: '#475569', fontSize: 13 },
  analysisCard: {
    backgroundColor: 'rgba(245,158,11,0.06)',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.15)',
    borderRadius: 16, padding: 16, gap: 12,
  },
  analysisSummary: { color: '#cbd5e1', fontSize: 14, lineHeight: 21 },
  analysisList: { gap: 4 },
  analysisListHeader: { color: '#f59e0b', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
  analysisItem: { color: '#94a3b8', fontSize: 13, lineHeight: 20 },
  analysisKeyMoment: { color: '#64748b', fontSize: 12, fontStyle: 'italic', lineHeight: 18 },

  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, padding: 16,
  },
  summaryText: { color: '#cbd5e1', fontSize: 14, lineHeight: 21 },

  coachingList: { gap: 8 },
  coachingItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: 'rgba(245,158,11,0.06)',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.15)',
    borderRadius: 12, padding: 14,
  },
  coachingBullet: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#f59e0b', marginTop: 6, flexShrink: 0,
  },
  coachingText: { flex: 1, color: '#cbd5e1', fontSize: 14, lineHeight: 21 },

  improveItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, padding: 14,
  },
  improveNum: {
    color: '#f59e0b', fontSize: 14, fontWeight: '800',
    width: 18, textAlign: 'center',
  },
  improveText: { flex: 1, color: '#cbd5e1', fontSize: 14, lineHeight: 21 },

  actions: { flexDirection: 'row', gap: 12 },
  secondaryBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  secondaryGrad: {
    paddingVertical: 16, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)', borderRadius: 14,
  },
  secondaryText: { color: '#f59e0b', fontSize: 15, fontWeight: '700' },
  primaryBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  primaryGrad: { paddingVertical: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
