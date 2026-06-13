import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSessionStore } from '../../store/sessionStore';
import { WingmanScore } from '../../components/WingmanScore';
import { computeWingmanScore } from '../../utils/scoring';
import { recordSessionStats } from '../../utils/statsStorage';

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
  }, []);

  const eventLabel = networkingSetup.eventName || 'Networking event';

  const firstName = (full: string) => full.split(/\s+/)[0] || full;

  return (
    <View style={s.root}>
      <LinearGradient colors={['#06181c', '#050510']} style={StyleSheet.absoluteFillObject} />
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
