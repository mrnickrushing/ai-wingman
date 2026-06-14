import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Animated, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface Props {
  onAgree: () => void;
}

interface Point {
  icon: string;
  title: string;
  body: string;
  highlight?: boolean;
}

// The consent gate exists for two reasons: App Store review expects a clear
// disclosure for an app that listens to conversations, and in many
// jurisdictions all parties to a conversation must consent to being recorded.
// The responsibility point is highlighted because it is the legally important
// one — the user, not us, must secure consent before each conversation.
const POINTS: Point[] = [
  {
    icon: '🎙️',
    title: 'Wingman listens only during a session',
    body: 'We use your microphone only while a session you start is running — never in the background.',
  },
  {
    icon: '🔒',
    title: 'Your audio is never stored',
    body: 'Audio is processed in real time to generate coaching, then discarded the moment your session ends.',
  },
  {
    icon: '🤫',
    title: 'Coaching is private to you',
    body: 'Suggestions are whispered only to your earpiece. The person you are talking to never hears them.',
  },
  {
    icon: '⚖️',
    title: 'You are responsible for consent',
    body: 'Recording and listening laws vary by location, and many require everyone in a conversation to agree first. You must obtain any consent the law requires before each conversation.',
    highlight: true,
  },
  {
    icon: '🤖',
    title: 'Coaching is AI-generated',
    body: 'Suggestions come from AI and may be inaccurate or inappropriate. They are guidance, not professional advice.',
  },
];

const TERMS_URL = 'https://aiwingman.rushingtechnologies.com/terms';
const PRIVACY_URL = 'https://aiwingman.rushingtechnologies.com/privacy';

export function ConsentScreen({ onAgree }: Props) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 450, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleAgree = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onAgree();
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={['#0c0c22', '#050510']} style={StyleSheet.absoluteFillObject} />
      <View style={s.orb} />

      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
            <View style={s.iconWrap}>
              <Text style={s.icon}>🎧</Text>
            </View>
            <Text style={s.title}>How Wingman listens</Text>
            <Text style={s.sub}>
              Please read this before your first session — it matters for you and for the people you talk to.
            </Text>

            <View style={s.points}>
              {POINTS.map((p, i) => (
                <View key={i} style={[s.point, p.highlight && s.pointHighlight]}>
                  <Text style={s.pointIcon}>{p.icon}</Text>
                  <View style={s.pointText}>
                    <Text style={s.pointTitle}>{p.title}</Text>
                    <Text style={s.pointBody}>{p.body}</Text>
                  </View>
                </View>
              ))}
            </View>

            <Text style={s.legal}>
              By continuing, you confirm you understand the above and agree to our{' '}
              <Text style={s.link} onPress={() => Linking.openURL(TERMS_URL).catch(() => {})}>
                Terms of Service
              </Text>
              {' '}and{' '}
              <Text style={s.link} onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}>
                Privacy Policy
              </Text>.
            </Text>
          </Animated.View>
        </ScrollView>

        <View style={s.footer}>
          <TouchableOpacity onPress={handleAgree} activeOpacity={0.85} style={s.btn}>
            <LinearGradient
              colors={['#6366f1', '#8b5cf6']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.btnGrad}
            >
              <Text style={s.btnText}>I Understand &amp; Agree</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050510' },
  safe: { flex: 1 },
  orb: {
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    top: -90, alignSelf: 'center', backgroundColor: 'rgba(99,102,241,0.08)',
  },
  content: { paddingHorizontal: 22, paddingTop: 32, paddingBottom: 24 },

  iconWrap: {
    width: 64, height: 64, borderRadius: 20, alignSelf: 'center',
    backgroundColor: 'rgba(99,102,241,0.14)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  icon: { fontSize: 30 },
  title: {
    color: '#f1f5f9', fontSize: 26, fontWeight: '800',
    letterSpacing: -0.5, textAlign: 'center',
  },
  sub: {
    color: '#94a3b8', fontSize: 14, lineHeight: 20,
    textAlign: 'center', marginTop: 10, marginBottom: 26, paddingHorizontal: 6,
  },

  points: { gap: 10 },
  point: {
    flexDirection: 'row', gap: 14, alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, padding: 16,
  },
  pointHighlight: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderColor: 'rgba(245,158,11,0.3)',
  },
  pointIcon: { fontSize: 22, marginTop: 1 },
  pointText: { flex: 1, gap: 3 },
  pointTitle: { color: '#f1f5f9', fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  pointBody: { color: '#94a3b8', fontSize: 13, lineHeight: 19 },

  legal: {
    color: '#64748b', fontSize: 12, lineHeight: 18,
    textAlign: 'center', marginTop: 22, paddingHorizontal: 6,
  },
  link: { color: '#818cf8', fontWeight: '600' },

  footer: {
    paddingHorizontal: 22, paddingTop: 10, paddingBottom: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  btn: { borderRadius: 16, overflow: 'hidden' },
  btnGrad: { paddingVertical: 17, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
});
