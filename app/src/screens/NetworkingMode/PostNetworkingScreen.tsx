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

const TIMINGS = ['Connect today', 'Follow up in 2 days', 'Reach out next week'];

interface Props {
  onNewSession: () => void;
  onHome: () => void;
}

export function PostNetworkingScreen({ onNewSession, onHome }: Props) {
  const { elapsedSeconds, wordsSelf, coachingHistory, networkingSetup, loggedContacts, lastRating, recordSession } = useSessionStore();
  const [analysis, setAnalysis] = useState<SessionAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
    const score = computeWingmanScore({
      coachingTipsTaken: coachingHistory.length,
      elapsedSeconds,
      wordsSelf,
      rating: lastRating,
    });
    recordSession(score);
    recordSessionStats(score);
    saveSession({
      mode: 'networking',
      title: networkingSetup.eventName || 'Networking event',
      durationSeconds: elapsedSeconds,
      wordsSpoken: wordsSelf,
      coachingCount: coachingHistory.length,
      score,
      rating: lastRating,
      transcriptText: '',
      coachingItems: coachingHistory.map((c) => c.text),
      context: {
        'Event': networkingSetup.eventName,
        'Contacts met': loggedContacts.join(', '),
      },
    }).then((s) => {
      setAnalysis(s?.analysis ?? null);
      setAnalysisLoading(false);
      resetInactivityNudge().catch(() => {});
      void saveSessionRecap(
        createSessionRecap({
          mode: 'networking',
          title: 'Networking recap',
          subtitle: eventLabel,
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
  }, []);

  const eventLabel = networkingSetup.eventName || 'Networking event';
  const eventReady = Boolean(networkingSetup.eventName && networkingSetup.attendees);
  const contactMomentum = loggedContacts.length > 0 ? 'Captured' : 'Missing';

  const firstName = (full: string) => full.split(/\s+/)[0] || full;

  return (
    <View style={s.root}>
      <LinearGradient colors={['#06181c', '#050510']} style={StyleSheet.absoluteFill} />
      <View style={s.topGlow} />

      <SafeAreaView style={s.safe}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
          <Animated.View style={[s.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={s.checkmark}>✓</Text>
            <Text style={s.title}>Event Recap</Text>
            <Text style={s.prospectLabel}>{eventLabel}</Text>
          </Animated.View>

          <WingmanScore
            coachingHistory={coachingHistory}
            elapsedSeconds={elapsedSeconds}
            wordsSelf={wordsSelf}
            rating={lastRating}
          />

          <SessionScorecard
            title="Networking scorecard"
            accent="#22d3ee"
            subtitle="Contacts, follow-through, and event context."
            metrics={[
              { label: 'Event context', value: eventReady ? 'Ready' : 'Partial', detail: eventReady ? 'You captured event and attendee context.' : 'Add event and attendee context next time.', weight: eventReady ? 90 : 48 },
              { label: 'Contacts', value: loggedContacts.length.toString(), detail: contactMomentum === 'Captured' ? 'Names were logged for follow-up.' : 'Log each contact to keep the loop alive.', weight: Math.max(24, Math.min(100, loggedContacts.length * 20 + 20)) },
              { label: 'Follow-up', value: loggedContacts.length > 0 ? 'Planned' : 'Open', detail: loggedContacts.length > 0 ? 'You have names to message after the event.' : 'No contacts logged yet.', weight: loggedContacts.length > 0 ? 86 : 34 },
            ]}
          />

          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={s.statIcon}>👥</Text>
              <Text style={s.statValue}>{loggedContacts.length}</Text>
              <Text style={s.statLabel}>Contacts met</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statIcon}>⏱</Text>
              <Text style={s.statValue}>{formatDuration(elapsedSeconds)}</Text>
              <Text style={s.statLabel}>Duration</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statIcon}>💡</Text>
              <Text style={s.statValue}>{coachingHistory.length}</Text>
              <Text style={s.statLabel}>Tips</Text>
            </View>
          </View>

          <Animated.View style={[s.section, { opacity: fadeAnim }]}>
            <Text style={s.sectionLabel}>WINGMAN ANALYSIS</Text>
            {analysisLoading ? (
              <View style={s.analysisLoading}>
                <ActivityIndicator size="small" color="#22d3ee" />
                <Text style={s.analysisLoadingText}>Analyzing your event...</Text>
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

          <Animated.View style={[s.section, { opacity: fadeAnim }]}>
            <Text style={s.sectionLabel}>FOLLOW-UPS</Text>
            {loggedContacts.length === 0 ? (
              <View style={s.summaryCard}>
                <Text style={s.summaryText}>
                  No contacts logged. Next time, tap "Log Contact" after each conversation to get
                  personalized follow-up templates here.
                </Text>
              </View>
            ) : (
              <View style={s.contactList}>
                {loggedContacts.map((contact, i) => (
                  <View key={`${contact}-${i}`} style={s.contactCard}>
                    <View style={s.contactHeader}>
                      <View style={s.contactAvatar}>
                        <Text style={s.contactInitial}>{contact[0]?.toUpperCase() ?? '?'}</Text>
                      </View>
                      <Text style={s.contactName}>{contact}</Text>
                      <View style={s.timingPill}>
                        <Text style={s.timingText}>{TIMINGS[i % TIMINGS.length]}</Text>
                      </View>
                    </View>
                    <Text style={s.messageLabel}>LinkedIn message</Text>
                    <Text style={s.messageText}>
                      {`Hi ${firstName(contact)}, great connecting at ${eventLabel}! I really enjoyed our chat — would love to keep the conversation going. Open to a quick call this week?`}
                    </Text>
                    <TouchableOpacity
                      style={s.shareBtn}
                      activeOpacity={0.75}
                      onPress={() => Share.share({ message: cleanText(`Hi ${firstName(contact)}, great connecting at ${eventLabel}! I really enjoyed our chat — would love to keep the conversation going. Open to a quick call this week?`) }).catch(() => {})}
                    >
                      <Text style={s.shareBtnText}>Share →</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>

          <Animated.View style={[s.actions, { opacity: fadeAnim }]}>
            <TouchableOpacity onPress={onNewSession} style={s.secondaryBtn} activeOpacity={0.8}>
              <LinearGradient
                colors={['rgba(34,211,238,0.2)', 'rgba(8,145,178,0.1)']}
                style={s.secondaryGrad}
              >
                <Text style={s.secondaryText}>🤝 New Session</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={onHome} style={s.primaryBtn} activeOpacity={0.8}>
              <LinearGradient
                colors={['#22d3ee', '#0891b2']}
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
    backgroundColor: 'rgba(34,211,238,0.07)',
  },
  content: { paddingHorizontal: 22, paddingTop: 40, paddingBottom: 48, gap: 28 },

  header: { alignItems: 'center', gap: 8 },
  checkmark: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(34,211,238,0.15)',
    borderWidth: 2, borderColor: 'rgba(34,211,238,0.35)',
    textAlign: 'center', lineHeight: 60,
    color: '#22d3ee', fontSize: 26, fontWeight: '800',
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

  analysisLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  analysisLoadingText: { color: '#475569', fontSize: 13 },
  analysisCard: {
    backgroundColor: 'rgba(34,211,238,0.06)',
    borderWidth: 1, borderColor: 'rgba(34,211,238,0.15)',
    borderRadius: 16, padding: 16, gap: 12,
  },
  analysisSummary: { color: '#cbd5e1', fontSize: 14, lineHeight: 21 },
  analysisList: { gap: 4 },
  analysisListHeader: { color: '#22d3ee', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
  analysisItem: { color: '#94a3b8', fontSize: 13, lineHeight: 20 },
  analysisKeyMoment: { color: '#64748b', fontSize: 12, fontStyle: 'italic', lineHeight: 18 },

  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, padding: 16,
  },
  summaryText: { color: '#cbd5e1', fontSize: 14, lineHeight: 21 },

  contactList: { gap: 12 },
  contactCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14, padding: 16, gap: 10,
  },
  contactHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  contactAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(34,211,238,0.2)',
    borderWidth: 1, borderColor: 'rgba(34,211,238,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  contactInitial: { color: '#22d3ee', fontSize: 14, fontWeight: '800' },
  contactName: { flex: 1, color: '#f1f5f9', fontSize: 15, fontWeight: '700' },
  timingPill: {
    backgroundColor: 'rgba(34,211,238,0.15)',
    borderWidth: 1, borderColor: 'rgba(34,211,238,0.3)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  timingText: { color: '#22d3ee', fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  messageLabel: { color: '#475569', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  messageText: { color: '#cbd5e1', fontSize: 13, lineHeight: 20 },
  shareBtn: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(34,211,238,0.15)',
    borderWidth: 1, borderColor: 'rgba(34,211,238,0.35)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7,
  },
  shareBtnText: { color: '#22d3ee', fontSize: 13, fontWeight: '700' },

  actions: { flexDirection: 'row', gap: 12 },
  secondaryBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  secondaryGrad: {
    paddingVertical: 16, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(34,211,238,0.25)', borderRadius: 14,
  },
  secondaryText: { color: '#22d3ee', fontSize: 15, fontWeight: '700' },
  primaryBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  primaryGrad: { paddingVertical: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
