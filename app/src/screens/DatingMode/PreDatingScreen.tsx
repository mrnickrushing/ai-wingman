import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSessionStore } from '../../store/sessionStore';
import { SessionPrepChecklist } from '../../components/SessionPrepChecklist';
import { SessionPreflightCard } from '../../components/SessionPreflightCard';

const INTENTS = ['Casual', 'Serious', 'Playful', 'Confident'];

interface Props {
  onStart: () => void;
  onBack: () => void;
}

export function PreDatingScreen({ onStart, onBack }: Props) {
  const { datingSetup, setDatingSetup } = useSessionStore();
  const [nameFocused, setNameFocused] = useState(false);
  const [urlFocused, setUrlFocused] = useState(false);

  const canStart = !!datingSetup.name.trim();

  return (
    <View style={s.root}>
      <LinearGradient colors={['#1a0c1e', '#050510']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          <View style={s.header}>
            <TouchableOpacity onPress={onBack} style={s.backBtn}>
              <Text style={s.backText}>← Back</Text>
            </TouchableOpacity>
            <View>
              <Text style={s.title}>Dating Mode</Text>
              <Text style={s.subtitle}>Set up your wingman</Text>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.scrollContent}
          >
            <SessionPrepChecklist
              title="Ready check"
              subtitle="Make sure the basics are in place before you start."
              items={[
                { label: 'Name', detail: datingSetup.name || 'Add their name', ready: Boolean(datingSetup.name.trim()) },
                { label: 'Intent', detail: datingSetup.intent || 'Pick an intent', ready: Boolean(datingSetup.intent) },
                { label: 'Profile', detail: datingSetup.profileUrl ? 'Link saved' : 'Optional', ready: Boolean(datingSetup.profileUrl.trim()) },
              ]}
            />
            <SessionPreflightCard />

            <View style={s.body}>
              <Text style={s.stepTitle}>Who are you meeting?</Text>
              <Text style={s.stepDesc}>A little context sharpens every suggestion.</Text>

              <View style={s.field}>
                <Text style={s.fieldLabel}>Their Name *</Text>
                <TextInput
                  style={[s.input, nameFocused && s.inputFocused]}
                  placeholder="Jordan"
                  placeholderTextColor="#334155"
                  value={datingSetup.name}
                  onChangeText={(v) => setDatingSetup({ name: v })}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                />
              </View>

              <View style={s.field}>
                <Text style={s.fieldLabel}>Instagram or LinkedIn URL</Text>
                <TextInput
                  style={[s.input, urlFocused && s.inputFocused]}
                  placeholder="https://instagram.com/..."
                  placeholderTextColor="#334155"
                  value={datingSetup.profileUrl}
                  onChangeText={(v) => setDatingSetup({ profileUrl: v })}
                  autoCapitalize="none"
                  keyboardType="url"
                  onFocus={() => setUrlFocused(true)}
                  onBlur={() => setUrlFocused(false)}
                />
              </View>

              <View style={s.field}>
                <Text style={s.fieldLabel}>Your Intent</Text>
                <View style={s.chipRow}>
                  {INTENTS.map((intent) => {
                    const active = datingSetup.intent === intent;
                    return (
                      <TouchableOpacity
                        key={intent}
                        onPress={() => setDatingSetup({ intent: active ? '' : intent })}
                        activeOpacity={0.8}
                        style={[s.chip, active && s.chipActive]}
                      >
                        <Text style={[s.chipText, active && s.chipTextActive]}>{intent}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={s.readyBox}>
                <Text style={s.readyIcon}>💘</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.readyTitle}>You're ready.</Text>
                  <Text style={s.readySub}>Pop in your AirPods and tap Start Session.</Text>
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
                colors={canStart ? ['#ec4899', '#f43f5e'] : ['#1e1e2e', '#1e1e2e']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.startGrad}
              >
                <Text style={[s.startText, !canStart && s.startTextDim]}>💘 Start Session</Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={s.footerHint}>
              {canStart ? 'Put phone in pocket · Wear AirPods · Go.' : 'Enter their name to begin'}
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
  backText: { color: '#ec4899', fontSize: 14, fontWeight: '600' },
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
  inputFocused: { borderColor: 'rgba(236,72,153,0.5)', backgroundColor: 'rgba(236,72,153,0.04)' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: 'rgba(236,72,153,0.15)',
    borderColor: 'rgba(236,72,153,0.5)',
  },
  chipText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#ec4899' },

  readyBox: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(236,72,153,0.08)',
    borderWidth: 1, borderColor: 'rgba(236,72,153,0.2)',
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
