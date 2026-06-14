import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSessionStore } from '../../store/sessionStore';
import { SessionPrepChecklist } from '../../components/SessionPrepChecklist';

const AUDIENCES = ['Investors', 'Customers', 'Internal', 'Press'];

interface Props {
  onStart: () => void;
  onBack: () => void;
}

export function PrePitchingScreen({ onStart, onBack }: Props) {
  const { pitchingSetup, setPitchingSetup } = useSessionStore();
  const [titleFocused, setTitleFocused] = useState(false);
  const [deckFocused, setDeckFocused] = useState(false);

  const canStart = !!pitchingSetup.title.trim();

  return (
    <View style={s.root}>
      <LinearGradient colors={['#1c1305', '#050510']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          <View style={s.header}>
            <TouchableOpacity onPress={onBack} style={s.backBtn}>
              <Text style={s.backText}>← Back</Text>
            </TouchableOpacity>
            <View>
              <Text style={s.title}>Pitching Mode</Text>
              <Text style={s.subtitle}>Prep before you take the room</Text>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.scrollContent}
          >
            <SessionPrepChecklist
              title="Ready check"
              subtitle="The stronger the setup, the better the cues."
              items={[
                { label: 'Title', detail: pitchingSetup.title || 'Add a pitch title', ready: Boolean(pitchingSetup.title.trim()) },
                { label: 'Audience', detail: pitchingSetup.audience || 'Choose the audience', ready: Boolean(pitchingSetup.audience) },
                { label: 'Deck', detail: pitchingSetup.deck ? 'Outline captured' : 'Optional but useful', ready: Boolean(pitchingSetup.deck.trim()) },
              ]}
            />

            <View style={s.body}>
              <Text style={s.stepTitle}>What are you pitching?</Text>
              <Text style={s.stepDesc}>Add your structure so Wingman can track timing and surface answers.</Text>

              <View style={s.field}>
                <Text style={s.fieldLabel}>Pitch / Presentation Title *</Text>
                <TextInput
                  style={[s.input, titleFocused && s.inputFocused]}
                  placeholder="Series A — Acme Robotics"
                  placeholderTextColor="#334155"
                  value={pitchingSetup.title}
                  onChangeText={(v) => setPitchingSetup({ title: v })}
                  onFocus={() => setTitleFocused(true)}
                  onBlur={() => setTitleFocused(false)}
                />
              </View>

              <View style={s.field}>
                <Text style={s.fieldLabel}>Deck Summary / Bullet Points</Text>
                <TextInput
                  style={[s.input, s.inputMulti, deckFocused && s.inputFocused]}
                  placeholder={'• Problem: ...\n• Solution: ...\n• Traction: $1.2M ARR, 40% MoM\n• Ask: $5M at $30M'}
                  placeholderTextColor="#334155"
                  value={pitchingSetup.deck}
                  onChangeText={(v) => setPitchingSetup({ deck: v })}
                  multiline
                  textAlignVertical="top"
                  autoCapitalize="sentences"
                  onFocus={() => setDeckFocused(true)}
                  onBlur={() => setDeckFocused(false)}
                />
              </View>

              <View style={s.field}>
                <Text style={s.fieldLabel}>Audience</Text>
                <View style={s.chipRow}>
                  {AUDIENCES.map((aud) => {
                    const active = pitchingSetup.audience === aud;
                    return (
                      <TouchableOpacity
                        key={aud}
                        onPress={() => setPitchingSetup({ audience: active ? '' : aud })}
                        activeOpacity={0.8}
                        style={[s.chip, active && s.chipActive]}
                      >
                        <Text style={[s.chipText, active && s.chipTextActive]}>{aud}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={s.readyBox}>
                <Text style={s.readyIcon}>🚀</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.readyTitle}>You're ready.</Text>
                  <Text style={s.readySub}>A timer keeps you on track while Wingman whispers cues.</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={s.footer}>
            <TouchableOpacity
              onPress={() => canStart && onStart()}
              style={s.startWrap}
              activeOpacity={canStart ? 0.82 : 1}
            >
              <LinearGradient
                colors={canStart ? ['#f59e0b', '#d97706'] : ['#1e1e2e', '#1e1e2e']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.startGrad}
              >
                <Text style={[s.startText, !canStart && s.startTextDim]}>🚀 Start Session</Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={s.footerHint}>
              {canStart ? 'Put phone in pocket · Wear AirPods · Go.' : 'Enter a pitch title to begin'}
            </Text>
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050510' },
  safe: { flex: 1 },
  header: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 12 },
  backBtn: { marginBottom: 10 },
  backText: { color: '#f59e0b', fontSize: 14, fontWeight: '600' },
  title: { color: '#f1f5f9', fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { color: '#475569', fontSize: 13, marginTop: 2 },

  scrollContent: { paddingHorizontal: 22, paddingBottom: 20 },
  body: { gap: 14, paddingTop: 8 },
  stepTitle: { color: '#f1f5f9', fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  stepDesc: { color: '#475569', fontSize: 13, lineHeight: 19 },

  field: { gap: 6 },
  fieldLabel: { color: '#64748b', fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    color: '#f1f5f9', fontSize: 15,
  },
  inputMulti: { minHeight: 120, paddingTop: 13 },
  inputFocused: { borderColor: 'rgba(245,158,11,0.5)', backgroundColor: 'rgba(245,158,11,0.04)' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderColor: 'rgba(245,158,11,0.5)',
  },
  chipText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#f59e0b' },

  readyBox: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)',
    borderRadius: 14, padding: 16, marginTop: 4,
  },
  readyIcon: { fontSize: 28 },
  readyTitle: { color: '#f1f5f9', fontSize: 15, fontWeight: '700' },
  readySub: { color: '#64748b', fontSize: 12, marginTop: 2, lineHeight: 17 },

  footer: { paddingHorizontal: 22, paddingBottom: 24, paddingTop: 12, gap: 10 },
  startWrap: { borderRadius: 16, overflow: 'hidden' },
  startGrad: { paddingVertical: 18, alignItems: 'center' },
  startText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
  startTextDim: { color: '#475569' },
  footerHint: { color: '#334155', fontSize: 12, textAlign: 'center' },
});
