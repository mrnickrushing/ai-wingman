import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSessionStore } from '../../store/sessionStore';

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
  const { elapsedSeconds, wordsSelf, coachingHistory, transcript, datingSetup } = useSessionStore();

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

  // Follow-up text suggestions with recommended timing.
  const followUps = [
    { timing: 'Text tonight', text: `"Had a genuinely great time tonight, ${datingSetup.name || 'you'} — let's do it again soon."` },
    { timing: 'Wait 2 days', text: '"Still thinking about that thing you said — when are you free this week?"' },
  ];

  const transcriptSummary = transcript
    .filter((t) => t.isFinal)
    .slice(-6)
    .map((t) => t.text)
    .join(' ');

  return (
    <View style={s.root}>
      <LinearGradient colors={['#1a0c1e', '#050510']} style={StyleSheet.absoluteFillObject} />
      <View style={s.topGlow} />

      <SafeAreaView style={s.safe}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
          <Animated.View style={[s.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={s.checkmark}>♥</Text>
            <Text style={s.title}>Date Recap</Text>
            <Text style={s.prospectLabel}>{datingSetup.name || 'Session ended'}</Text>
          </Animated.View>

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
              <Text style={s.sectionLabel}>TRANSCRIPT SUMMARY</Text>
              <View style={s.summaryCard}>
                <Text style={s.summaryText} numberOfLines={6}>{transcriptSummary}</Text>
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
            <Text style={s.sectionLabel}>FOLLOW-UP TEXTS</Text>
            <View style={s.coachingList}>
              {followUps.map((f, i) => (
                <View key={i} style={s.followCard}>
                  <View style={s.timingPill}>
                    <Text style={s.timingText}>{f.timing}</Text>
                  </View>
                  <Text style={s.followText}>{f.text}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          <Animated.View style={[s.section, { opacity: fadeAnim }]}>
            <Text style={s.sectionLabel}>ATTRACTION PROFILE</Text>
            <View style={s.summaryCard}>
              <Text style={s.summaryText}>
                {coachingHistory.length > 0
                  ? 'Responded well to genuine curiosity and playful callbacks. Keep the energy warm and ask open questions next time.'
                  : 'Not enough signal captured this session — keep the conversation flowing next time to build a richer profile.'}
              </Text>
            </View>
          </Animated.View>

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
