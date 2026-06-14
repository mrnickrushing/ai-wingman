import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Animated, Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { loadStats, PersistedStats } from '../utils/statsStorage';

interface Mode {
  id: string;
  emoji: string;
  label: string;
  subtitle: string;
  description: string;
  gradient: readonly [string, string, string];
  accent: string;
  available: boolean;
}

const MODES: Mode[] = [
  {
    id: 'sales',
    emoji: '💼',
    label: 'Sales & Cold Calls',
    subtitle: 'Never freeze on an objection again',
    description: 'Objection rebuttals · Buying signal alerts · Pace coaching',
    gradient: ['rgba(99,102,241,0.2)', 'rgba(139,92,246,0.1)', 'rgba(13,13,31,0)'],
    accent: '#6366f1',
    available: true,
  },
  {
    id: 'dating',
    emoji: '💘',
    label: 'Dating Mode',
    subtitle: 'From first impression to second date',
    description: 'Silence detection · Tone reading · Callback cues',
    gradient: ['rgba(236,72,153,0.15)', 'rgba(244,63,94,0.07)', 'rgba(13,13,31,0)'],
    accent: '#ec4899',
    available: true,
  },
  {
    id: 'networking',
    emoji: '🤝',
    label: 'Networking',
    subtitle: 'Work any room like a pro',
    description: 'Contact prep · Graceful exits · Follow-up generator',
    gradient: ['rgba(34,211,238,0.15)', 'rgba(8,145,178,0.07)', 'rgba(13,13,31,0)'],
    accent: '#22d3ee',
    available: true,
  },
  {
    id: 'pitching',
    emoji: '🚀',
    label: 'Pitching & Presenting',
    subtitle: 'Never lose the room',
    description: 'Slide tracking · Q&A support · Room energy alerts',
    gradient: ['rgba(245,158,11,0.15)', 'rgba(217,119,6,0.07)', 'rgba(13,13,31,0)'],
    accent: '#f59e0b',
    available: true,
  },
  {
    id: 'hard_conversations',
    emoji: '🔥',
    label: 'Hard Conversations',
    subtitle: 'Negotiations, firings, breakups',
    description: 'De-escalation · Legal phrasing · Empathy cues',
    gradient: ['rgba(139,92,246,0.15)', 'rgba(124,58,237,0.07)', 'rgba(13,13,31,0)'],
    accent: '#8b5cf6',
    available: true,
  },
];

interface Props {
  onSelectMode: (modeId: string) => void;
}

export function HomeScreen({ onSelectMode }: Props) {
  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef(MODES.map(() => new Animated.Value(0))).current;
  const [stats, setStats] = useState<PersistedStats>({
    sessions: 0, bestScore: 0, streak: 0, lastSessionDate: null,
  });

  useEffect(() => {
    loadStats().then(setStats);
  }, []);

  const liveStats = [
    { val: stats.sessions.toString(), lbl: 'sessions' },
    { val: stats.bestScore > 0 ? stats.bestScore.toString() : '--', lbl: 'best score' },
    { val: stats.streak > 0 ? `${stats.streak}d` : '--', lbl: 'streak' },
  ];

  const handlePress = (mode: Mode) => {
    if (mode.available) {
      onSelectMode(mode.id);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Alert.alert(
      `${mode.emoji}  ${mode.label}`,
      `${mode.label} is coming soon. We'll let you know the moment it's live.`
    );
  };

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    MODES.forEach((_, i) => {
      Animated.spring(cardAnims[i], {
        toValue: 1, delay: 180 + i * 65,
        tension: 55, friction: 9, useNativeDriver: true,
      }).start();
    });
  }, []);

  return (
    <View style={s.root}>
      <LinearGradient colors={['#0c0c22', '#050510']} style={StyleSheet.absoluteFill} />
      <View style={s.orb1} />
      <View style={s.orb2} />

      <SafeAreaView style={s.safe}>
        <Animated.View style={[s.header, {
          opacity: headerAnim,
          transform: [{ translateY: headerAnim.interpolate({ inputRange: [0,1], outputRange: [-20,0] }) }],
        }]}>
          <View>
            <Text style={s.logo}>🎧 AI Wingman</Text>
            <Text style={s.tagline}>The smartest person in every room.</Text>
          </View>
          <View style={s.livePill}>
            <View style={s.liveDot} />
            <Text style={s.liveText}>LIVE</Text>
          </View>
        </Animated.View>

        <Animated.View style={[s.statsRow, { opacity: headerAnim }]}>
          {liveStats.map((st, i) => (
            <View key={i} style={[s.statCell, i < 2 && s.statBorder]}>
              <Text style={s.statVal}>{st.val}</Text>
              <Text style={s.statLbl}>{st.lbl}</Text>
            </View>
          ))}
        </Animated.View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.sectionLabel}>CHOOSE YOUR MODE</Text>

          {MODES.map((mode, i) => (
            <Animated.View
              key={mode.id}
              style={{
                opacity: cardAnims[i],
                transform: [{
                  translateX: cardAnims[i].interpolate({ inputRange: [0,1], outputRange: [44, 0] }),
                }],
              }}
            >
              <TouchableOpacity
                onPress={() => handlePress(mode)}
                activeOpacity={mode.available ? 0.72 : 0.95}
                style={s.cardOuter}
              >
                <LinearGradient
                  colors={mode.available ? mode.gradient : ['#0d0d1f', '#0d0d1f', '#0d0d1f']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    s.card,
                    { borderLeftColor: mode.available ? mode.accent : '#1a1a2e' },
                    !mode.available && s.cardDim,
                  ]}
                >
                  <View style={s.cardRow}>
                    <Text style={[s.cardEmoji, !mode.available && { opacity: 0.3 }]}>
                      {mode.emoji}
                    </Text>
                    <View style={s.cardMid}>
                      <Text style={[s.cardTitle, !mode.available && s.cardTitleDim]}>
                        {mode.label}
                      </Text>
                      <Text style={s.cardSub}>{mode.subtitle}</Text>
                      {mode.available && (
                        <Text style={[s.cardDesc, { color: mode.accent + 'bb' }]}>
                          {mode.description}
                        </Text>
                      )}
                    </View>
                    <View style={s.badgeCol}>
                      {mode.available ? (
                        <View style={[s.badge, { backgroundColor: mode.accent + '20', borderColor: mode.accent + '50' }]}>
                          <View style={[s.badgeDot, { backgroundColor: mode.accent }]} />
                          <Text style={[s.badgeText, { color: mode.accent }]}>LIVE</Text>
                        </View>
                      ) : (
                        <View style={s.badgeSoon}>
                          <Text style={s.badgeSoonText}>SOON</Text>
                        </View>
                      )}
                      {mode.available && (
                        <Text style={[s.arrow, { color: mode.accent }]}>→</Text>
                      )}
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          ))}

          <View style={s.footer}>
            <Text style={s.footerText}>
              🔒 Audio never stored beyond your session
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050510' },
  safe: { flex: 1 },
  orb1: {
    position: 'absolute', width: 280, height: 280,
    borderRadius: 140, top: -80, left: -80,
    backgroundColor: 'rgba(99,102,241,0.08)',
  },
  orb2: {
    position: 'absolute', width: 200, height: 200,
    borderRadius: 100, top: 180, right: -60,
    backgroundColor: 'rgba(139,92,246,0.06)',
  },
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 22, paddingTop: 18, paddingBottom: 14,
  },
  logo: { color: '#f1f5f9', fontSize: 23, fontWeight: '800', letterSpacing: -0.5 },
  tagline: { color: '#6366f1', fontSize: 11, fontWeight: '600', letterSpacing: 0.3, marginTop: 3 },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(74,222,128,0.1)',
    borderWidth: 1, borderColor: 'rgba(74,222,128,0.28)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, marginTop: 2,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80' },
  liveText: { color: '#4ade80', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  statsRow: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 13,
  },
  statCell: { flex: 1, alignItems: 'center' },
  statBorder: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.05)' },
  statVal: { color: '#f1f5f9', fontSize: 14, fontWeight: '800', letterSpacing: -0.3 },
  statLbl: { color: '#475569', fontSize: 10, fontWeight: '500', marginTop: 2 },
  scroll: { flex: 1 },
  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 9 },
  sectionLabel: {
    color: '#2d3748', fontSize: 10, fontWeight: '700',
    letterSpacing: 2.5, marginBottom: 4, paddingLeft: 4,
  },
  cardOuter: { borderRadius: 16, overflow: 'hidden' },
  card: {
    borderRadius: 16, padding: 18, borderLeftWidth: 3,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.055)',
  },
  cardDim: { opacity: 0.4 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cardEmoji: { fontSize: 30 },
  cardMid: { flex: 1, gap: 3 },
  cardTitle: { color: '#f1f5f9', fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  cardTitleDim: { color: '#3d4060' },
  cardSub: { color: '#64748b', fontSize: 12, lineHeight: 17 },
  cardDesc: { fontSize: 11, fontWeight: '500', marginTop: 2, lineHeight: 16 },
  badgeCol: { alignItems: 'flex-end', gap: 8, flexShrink: 0 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1,
  },
  badgeDot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  badgeSoon: {
    backgroundColor: 'rgba(30,30,50,0.8)',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  badgeSoonText: { color: '#334155', fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  arrow: { fontSize: 18, fontWeight: '700' },
  footer: { marginTop: 16, alignItems: 'center' },
  footerText: { color: '#1e293b', fontSize: 11, fontWeight: '500' },
});
