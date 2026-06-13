import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSessionStore } from '../../store/sessionStore';

interface Props {
  onStart: () => void;
  onBack: () => void;
}

export function PreNetworkingScreen({ onStart, onBack }: Props) {
  const { networkingSetup, setNetworkingSetup } = useSessionStore();
  const [eventFocused, setEventFocused] = useState(false);
  const [attFocused, setAttFocused] = useState(false);

  const canStart = !!networkingSetup.eventName.trim();
  const targetCount = networkingSetup.attendees
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean).length;

  return (
    <View style={s.root}>
      <LinearGradient colors={['#06181c', '#050510']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          <View style={s.header}>
            <TouchableOpacity onPress={onBack} style={s.backBtn}>
              <Text style={s.backText}>← Back</Text>
            </TouchableOpacity>
            <View>
              <Text style={s.title}>Networking Mode</Text>
              <Text style={s.subtitle}>Prep before you work the room</Text>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.scrollContent}
          >
            <View style={s.body}>
              <Text style={s.stepTitle}>What's the event?</Text>
              <Text style={s.stepDesc}>Add target contacts and Wingman pre-loads conversation starters.</Text>

              <View style={s.field}>
                <Text style={s.fieldLabel}>Event Name *</Text>
                <TextInput
                  style={[s.input, eventFocused && s.inputFocused]}
                  placeholder="SaaStr Annual 2026"
                  placeholderTextColor="#334155"
                  value={networkingSetup.eventName}
                  onChangeText={(v) => setNetworkingSetup({ eventName: v })}
                  onFocus={() => setEventFocused(true)}
                  onBlur={() => setEventFocused(false)}
                />
              </View>

              <View style={s.field}>
                <Text style={s.fieldLabel}>Target Contacts (one per line)</Text>
                <TextInput
                  style={[s.input, s.inputMulti, attFocused && s.inputFocused]}
                  placeholder={'Sarah Kim — investor\nDevon Lee — founder\nPriya Patel — eng lead'}
                  placeholderTextColor="#334155"
                  value={networkingSetup.attendees}
                  onChangeText={(v) => setNetworkingSetup({ attendees: v })}
                  multiline
                  textAlignVertical="top"
                  autoCapitalize="words"
                  onFocus={() => setAttFocused(true)}
                  onBlur={() => setAttFocused(false)}
                />
                {targetCount > 0 && (
                  <Text style={s.countHint}>{targetCount} contact{targetCount === 1 ? '' : 's'} loaded</Text>
                )}
              </View>

              <View style={s.readyBox}>
                <Text style={s.readyIcon}>🤝</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.readyTitle}>You're ready.</Text>
                  <Text style={s.readySub}>Tap a contact's name mid-event to log who you've met.</Text>
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
                colors={canStart ? ['#22d3ee', '#0891b2'] : ['#1e1e2e', '#1e1e2e']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.startGrad}
              >
                <Text style={[s.startText, !canStart && s.startTextDim]}>🤝 Start Session</Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={s.footerHint}>
              {canStart ? 'Put phone in pocket · Wear AirPods · Go.' : 'Enter the event name to begin'}
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
  backText: { color: '#22d3ee', fontSize: 14, fontWeight: '600' },
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
  inputFocused: { borderColor: 'rgba(34,211,238,0.5)', backgroundColor: 'rgba(34,211,238,0.04)' },
  countHint: { color: '#22d3ee', fontSize: 11, fontWeight: '600', marginTop: 2 },

  readyBox: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(34,211,238,0.08)',
    borderWidth: 1, borderColor: 'rgba(34,211,238,0.2)',
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
