import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  REQUIRED_LEGAL_ACKNOWLEDGMENTS,
  type LegalAcknowledgment,
} from '../services/legalConsent';

interface Props {
  onAgree: () => Promise<void>;
}

type Agreement = {
  id: LegalAcknowledgment;
  icon: string;
  title: string;
  body: string;
  tone?: 'warning';
};

const AGREEMENTS: Agreement[] = [
  {
    id: 'ai-limitations',
    icon: '🤖',
    title: 'I understand AI coaching has limits',
    body: 'Suggestions may be inaccurate, biased, incomplete, or inappropriate. AI Wingman is not a doctor, therapist, lawyer, financial advisor, or HR professional, and it must not be used for emergencies or high-stakes decisions.',
  },
  {
    id: 'participant-consent',
    icon: '⚖️',
    title: 'I will inform everyone and get consent',
    body: 'Before every live session, I will tell every participant that AI Wingman will listen, transmit, transcribe, and analyze the conversation. I will obtain their affirmative consent and comply with every law that applies.',
    tone: 'warning',
  },
  {
    id: 'audio-and-transcripts',
    icon: '🎙️',
    title: 'I understand how conversation data is handled',
    body: 'During a session I start, microphone audio is sent to service providers for transcription and coaching. Capture may continue while my screen is locked or the app is in the background until I end the session. Raw audio is discarded after processing; transcripts and coaching recaps may be saved for up to 90 days.',
  },
  {
    id: 'terms-and-privacy',
    icon: '📄',
    title: 'I accept the governing agreements',
    body: 'I have reviewed and agree to the Terms of Service and Privacy Policy. I understand that updated material terms may require me to accept again.',
  },
];

const TERMS_URL = 'https://aiwingman.rushingtechnologies.com/terms';
const PRIVACY_URL = 'https://aiwingman.rushingtechnologies.com/privacy';

export function ConsentScreen({ onAgree }: Props) {
  const [checked, setChecked] = useState<Set<LegalAcknowledgment>>(() => new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start();
  }, [fade, slide]);

  const allAccepted = useMemo(
    () => REQUIRED_LEGAL_ACKNOWLEDGMENTS.every((item) => checked.has(item)),
    [checked]
  );

  const toggle = (id: LegalAcknowledgment) => {
    if (submitting) return;
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setError(null);
    Haptics.selectionAsync().catch(() => {});
  };

  const handleAgree = async () => {
    if (!allAccepted || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onAgree();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      setError('Your acceptance could not be saved. Please try again before continuing.');
      setSubmitting(false);
    }
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={['#0c0c22', '#050510']} style={StyleSheet.absoluteFill} />
      <View style={s.orb} />

      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
            <View style={s.eyebrowRow}>
              <View style={s.requiredDot} />
              <Text style={s.eyebrow}>REQUIRED BEFORE USING AI WINGMAN</Text>
            </View>
            <Text style={s.title}>Review and agree</Text>
            <Text style={s.sub}>
              Check each item yourself. These acknowledgments protect you and the people in every conversation.
            </Text>

            <View style={s.agreements}>
              {AGREEMENTS.map((agreement) => {
                const active = checked.has(agreement.id);
                return (
                  <Pressable
                    key={agreement.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: active, disabled: submitting }}
                    accessibilityLabel={`${agreement.title}. ${agreement.body}`}
                    disabled={submitting}
                    onPress={() => toggle(agreement.id)}
                    style={({ pressed }) => [
                      s.agreement,
                      agreement.tone === 'warning' && s.agreementWarning,
                      active && s.agreementActive,
                      pressed && s.agreementPressed,
                    ]}
                  >
                    <View style={[s.checkbox, active && s.checkboxActive]}>
                      {active ? <Text style={s.checkmark}>✓</Text> : null}
                    </View>
                    <View style={s.agreementCopy}>
                      <View style={s.agreementTitleRow}>
                        <Text style={s.agreementIcon}>{agreement.icon}</Text>
                        <Text style={s.agreementTitle}>{agreement.title}</Text>
                      </View>
                      <Text style={s.agreementBody}>{agreement.body}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={s.linksRow}>
              <Pressable
                accessibilityRole="link"
                onPress={() => Linking.openURL(TERMS_URL).catch(() => {})}
                style={s.linkButton}
              >
                <Text style={s.linkText}>Terms of Service ↗</Text>
              </Pressable>
              <Pressable
                accessibilityRole="link"
                onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}
                style={s.linkButton}
              >
                <Text style={s.linkText}>Privacy Policy ↗</Text>
              </Pressable>
            </View>

            <Text style={s.declineNote}>If you do not agree, do not use AI Wingman.</Text>
          </Animated.View>
        </ScrollView>

        <View style={s.footer}>
          {error ? <Text style={s.error} accessibilityRole="alert">{error}</Text> : null}
          <Text style={s.progress}>
            {checked.size} of {REQUIRED_LEGAL_ACKNOWLEDGMENTS.length} required items accepted
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !allAccepted || submitting }}
            disabled={!allAccepted || submitting}
            onPress={handleAgree}
            style={[s.button, (!allAccepted || submitting) && s.buttonDisabled]}
          >
            <LinearGradient
              colors={allAccepted ? ['#6366f1', '#8b5cf6'] : ['#202033', '#202033']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.buttonGradient}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={[s.buttonText, !allAccepted && s.buttonTextDisabled]}>Agree and continue</Text>}
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050510' },
  safe: { flex: 1 },
  orb: {
    position: 'absolute',
    width: 330,
    height: 330,
    borderRadius: 165,
    top: -170,
    alignSelf: 'center',
    backgroundColor: 'rgba(99,102,241,0.12)',
  },
  content: { paddingHorizontal: 20, paddingTop: 26, paddingBottom: 28 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 12 },
  requiredDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#f59e0b' },
  eyebrow: { color: '#fbbf24', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: '#f8fafc', fontSize: 30, fontWeight: '900', letterSpacing: -0.8, textAlign: 'center' },
  sub: { color: '#94a3b8', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10, marginBottom: 22 },
  agreements: { gap: 10 },
  agreement: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  agreementWarning: { borderColor: 'rgba(245,158,11,0.26)', backgroundColor: 'rgba(245,158,11,0.055)' },
  agreementActive: { borderColor: 'rgba(129,140,248,0.62)', backgroundColor: 'rgba(99,102,241,0.12)' },
  agreementPressed: { opacity: 0.84 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#64748b',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxActive: { backgroundColor: '#6366f1', borderColor: '#818cf8' },
  checkmark: { color: '#fff', fontSize: 15, fontWeight: '900' },
  agreementCopy: { flex: 1 },
  agreementTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  agreementIcon: { fontSize: 16 },
  agreementTitle: { flex: 1, color: '#f1f5f9', fontSize: 14, lineHeight: 19, fontWeight: '800' },
  agreementBody: { color: '#94a3b8', fontSize: 12.5, lineHeight: 18, marginTop: 6 },
  linksRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  linkButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.25)',
    backgroundColor: 'rgba(99,102,241,0.08)',
  },
  linkText: { color: '#a5b4fc', fontSize: 12, fontWeight: '800' },
  declineNote: { color: '#64748b', fontSize: 11, textAlign: 'center', marginTop: 16 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(5,5,16,0.97)',
  },
  progress: { color: '#94a3b8', fontSize: 11, textAlign: 'center', marginBottom: 8 },
  error: { color: '#fda4af', fontSize: 12, textAlign: 'center', marginBottom: 8 },
  button: { borderRadius: 15, overflow: 'hidden' },
  buttonDisabled: { opacity: 0.72 },
  buttonGradient: { minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  buttonTextDisabled: { color: '#64748b' },
});
