import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Animated, ActivityIndicator, Share,
} from 'react-native';

function cleanText(raw: string): string {
  return raw.replace(/^["'"']+|["'"']+$/gu, '').trim();
}
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
  onDone: () => void;
  onCallAgain: () => void;
}

export function PostCallScreen({ onDone, onCallAgain }: Props) {
  const { elapsedSeconds, wordsSelf, coachingHistory, transcript, salesSetup, setRating: persistRating, recordSession } = useSessionStore();
  const [rating, setRating] = useState(0);
  const [analysis, setAnalysis] = useState<SessionAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);

  useEffect(() => {
    const score = computeWingmanScore({
      coachingTipsTaken: coachingHistory.length,
      elapsedSeconds,
      wordsSelf,
      rating: 0,
    });
    recordSession(score);
    recordSessionStats(score);
    const transcriptText = transcript.filter((t) => t.isFinal).map((t) => t.text).join(' ');
    const title = [salesSetup.prospectName, salesSetup.company].filter(Boolean).join(' · ') || 'Sales call';
    saveSession({
      mode: 'sales',
      title,
      durationSeconds: elapsedSeconds,
      wordsSpoken: wordsSelf,
      coachingCount: coachingHistory.length,
      score,
      rating: 0,
      transcriptText,
      coachingItems: coachingHistory.map((c) => c.text),
      context: {
        'Prospect': salesSetup.prospectName,
        'Company': salesSetup.company,
        'Role': salesSetup.role,
        'Call goal': salesSetup.callGoal,
      },
    }).then((s) => {
      setAnalysis(s?.analysis ?? null);
      setAnalysisLoading(false);
      resetInactivityNudge().catch(() => {});
      void saveSessionRecap(
        createSessionRecap({
          mode: 'sales',
          title: 'Sales recap',
          subtitle: title,
          score,
          durationSeconds: elapsedSeconds,
          coachingTips: coachingHistory.length,
          wordsSelf,
          rating,
          summary: buildSessionSummary(transcript, coachingHistory),
          highlights: buildHighlights(coachingHistory),
        })
      );
    });
  }, []);

  // North Star metric: "Did Wingman help you get the outcome you wanted?"
  // Capture it into the store so it survives this screen and can be sent
  // to the backend once a ratings endpoint exists.
  const handleRate = (star: number) => {
    setRating(star);
    persistRating(star);
  };

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

  const minutes = elapsedSeconds / 60;
  const wpm = minutes > 0 ? Math.round(wordsSelf / minutes) : 0;
  const wpmColor = wpm > 150 ? '#ec4899' : wpm > 120 ? '#f59e0b' : '#4ade80';
  const wpmLabel = wpm > 150 ? 'Fast pace — slow down a bit' : wpm > 120 ? 'Slightly quick — watch the pace' : 'Good speaking pace';

  const stats = [
    { value: formatDuration(elapsedSeconds), label: 'Duration', icon: '⏱' },
    { value: coachingHistory.length.toString(), label: 'Coaching tips', icon: '💡' },
    { value: wordsSelf.toString(), label: 'Words spoken', icon: '🎙' },
  ];

  return (
    <View style={s.root}>
      <LinearGradient colors={['#0c0c22', '#050510']} style={StyleSheet.absoluteFill} />
      <View style={s.topGlow} />

      <SafeAreaView style={s.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.content}
        >
          {/* Header */}
          <Animated.View style={[s.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={s.checkmark}>✓</Text>
            <Text style={s.title}>Call Complete</Text>
            <Text style={s.prospectLabel}>
              {[salesSetup.prospectName, salesSetup.company].filter(Boolean).join(' · ') || 'Session ended'}
            </Text>
          </Animated.View>

          {/* Wingman Score */}
          <WingmanScore
            coachingHistory={coachingHistory}
            elapsedSeconds={elapsedSeconds}
            wordsSelf={wordsSelf}
            rating={rating}
          />

          {/* Stats */}
          <View style={s.statsRow}>
            {stats.map((stat, i) => (
              <Animated.View
                key={i}
                style={[
                  s.statCard,
                  {
                    opacity: statAnims[i],
                    transform: [{
                      translateY: statAnims[i].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }),
                    }],
                  },
                ]}
              >
                <Text style={s.statIcon}>{stat.icon}</Text>
                <Text style={s.statValue}>
                  {stat.value}
                </Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </Animated.View>
            ))}
          </View>

          {/* Speaking pace feedback */}
          {elapsedSeconds > 10 && wordsSelf > 0 && (
            <Animated.View style={[s.feedbackCard, { opacity: fadeAnim }]}>
              <View style={s.feedbackRow}>
                <View style={[s.feedbackDot, { backgroundColor: wpmColor }]} />
                <Text style={s.feedbackText}>{wpmLabel}</Text>
              </View>
              <View style={s.ratioBar}>
                <View style={[s.ratioFill, { width: `${Math.min(100, (wpm / 200) * 100)}%`, backgroundColor: wpmColor }]} />
              </View>
              <View style={s.ratioLabels}>
                <Text style={s.ratioLabelLeft}>{wpm} wpm</Text>
                <Text style={s.ratioLabelRight}>target ≤120</Text>
              </View>
            </Animated.View>
          )}

          {/* Coaching highlights */}
          {coachingHistory.length > 0 && (
            <Animated.View style={[s.section, { opacity: fadeAnim }]}>
              <Text style={s.sectionLabel}>COACHING HIGHLIGHTS</Text>
              <View style={s.coachingList}>
                {coachingHistory.slice(-5).reverse().map((entry, i) => (
                  <View key={entry.id} style={s.coachingItem}>
                    <View style={s.coachingBullet} />
                    <Text style={s.coachingText}>{entry.text}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* AI Analysis */}
          <Animated.View style={[s.section, { opacity: fadeAnim }]}>
            <Text style={s.sectionLabel}>WINGMAN ANALYSIS</Text>
            {analysisLoading ? (
              <View style={s.analysisLoading}>
                <ActivityIndicator size="small" color="#6366f1" />
                <Text style={s.analysisLoadingText}>Analyzing your session...</Text>
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
            {analysis?.followUps && analysis.followUps.length > 0 && (
              <View style={s.followUpList}>
                {analysis.followUps.map((f, i) => (
                  <View key={i} style={s.followCard}>
                    <View style={s.timingPill}><Text style={s.timingText}>{f.timing}</Text></View>
                    <Text style={s.followText}>{f.text}</Text>
                    <TouchableOpacity
                      style={s.shareBtn}
                      activeOpacity={0.75}
                      onPress={() => Share.share({ message: cleanText(f.text) }).catch(() => {})}
                    >
                      <Text style={s.shareBtnText}>Share →</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>

          {/* Rating */}
          <Animated.View style={[s.section, { opacity: fadeAnim }]}>
            <Text style={s.sectionLabel}>HOW'D IT GO?</Text>
            <View style={s.starsRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity
                  key={star}
                  onPress={() => handleRate(star)}
                  style={s.starBtn}
                  activeOpacity={0.7}
                >
                  <Text style={[s.star, rating >= star && s.starActive]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
            {rating > 0 && (
              <Text style={s.ratingLabel}>
                {['', 'Rough one.', 'Could be better.', 'Not bad.', 'Good call!', 'Crushed it! 🎉'][rating]}
              </Text>
            )}
          </Animated.View>

          {/* Actions */}
          <Animated.View style={[s.actions, { opacity: fadeAnim }]}>
            <TouchableOpacity onPress={onCallAgain} style={s.callAgainBtn} activeOpacity={0.8}>
              <LinearGradient
                colors={['rgba(99,102,241,0.2)', 'rgba(139,92,246,0.1)']}
                style={s.callAgainGrad}
              >
                <Text style={s.callAgainText}>📞 Call Again</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDone} style={s.doneBtn} activeOpacity={0.8}>
              <LinearGradient
                colors={['#6366f1', '#8b5cf6']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.doneGrad}
              >
                <Text style={s.doneText}>Done →</Text>
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
    backgroundColor: 'rgba(99,102,241,0.07)',
  },
  content: { paddingHorizontal: 22, paddingTop: 40, paddingBottom: 48, gap: 28 },

  header: { alignItems: 'center', gap: 8 },
  checkmark: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(74,222,128,0.15)',
    borderWidth: 2, borderColor: 'rgba(74,222,128,0.35)',
    textAlign: 'center', lineHeight: 60,
    color: '#4ade80', fontSize: 26, fontWeight: '800',
    overflow: 'hidden',
  },
  title: {
    color: '#f1f5f9', fontSize: 26, fontWeight: '800', letterSpacing: -0.5,
  },
  prospectLabel: { color: '#64748b', fontSize: 13 },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, padding: 16, alignItems: 'center', gap: 4,
  },
  statIcon: { fontSize: 22 },
  statValue: {
    color: '#f1f5f9', fontSize: 18, fontWeight: '800', letterSpacing: -0.3,
  },
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
  ratioLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  ratioLabelLeft: { color: '#475569', fontSize: 11 },
  ratioLabelRight: { color: '#475569', fontSize: 11 },

  section: { gap: 12 },
  sectionLabel: {
    color: '#334155', fontSize: 10, fontWeight: '700', letterSpacing: 2,
  },
  coachingList: { gap: 8 },
  coachingItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: 'rgba(99,102,241,0.06)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)',
    borderRadius: 12, padding: 14,
  },
  coachingBullet: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#8b5cf6', marginTop: 6, flexShrink: 0,
  },
  coachingText: { flex: 1, color: '#cbd5e1', fontSize: 14, lineHeight: 21 },

  analysisLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  analysisLoadingText: { color: '#475569', fontSize: 13 },
  analysisCard: {
    backgroundColor: 'rgba(99,102,241,0.06)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)',
    borderRadius: 16, padding: 16, gap: 12,
  },
  analysisSummary: { color: '#cbd5e1', fontSize: 14, lineHeight: 21 },
  analysisList: { gap: 4 },
  analysisListHeader: { color: '#6366f1', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
  analysisItem: { color: '#94a3b8', fontSize: 13, lineHeight: 20 },
  analysisKeyMoment: { color: '#64748b', fontSize: 12, fontStyle: 'italic', lineHeight: 18 },
  followUpList: { gap: 8 },
  followCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, padding: 14, gap: 8,
  },
  timingPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  timingText: { color: '#6366f1', fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  followText: { color: '#cbd5e1', fontSize: 14, lineHeight: 21 },
  shareBtn: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.35)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7,
  },
  shareBtnText: { color: '#6366f1', fontSize: 13, fontWeight: '700' },

  starsRow: { flexDirection: 'row', gap: 8 },
  starBtn: { padding: 4 },
  star: { fontSize: 32, color: '#1e293b' },
  starActive: { color: '#f59e0b' },
  ratingLabel: {
    color: '#64748b', fontSize: 13, fontStyle: 'italic', marginTop: 4,
  },

  actions: { flexDirection: 'row', gap: 12 },
  callAgainBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  callAgainGrad: {
    paddingVertical: 16, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.25)', borderRadius: 14,
  },
  callAgainText: { color: '#6366f1', fontSize: 15, fontWeight: '700' },
  doneBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  doneGrad: { paddingVertical: 16, alignItems: 'center' },
  doneText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
