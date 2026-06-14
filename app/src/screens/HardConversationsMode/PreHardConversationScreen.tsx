import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSessionStore } from '../../store/sessionStore';
import { HardConversationScenario } from '../../types';
import { SessionPrepChecklist } from '../../components/SessionPrepChecklist';

const SCENARIOS: { id: HardConversationScenario; label: string }[] = [
  { id: 'salary_negotiation', label: 'Salary Negotiation' },
  { id: 'firing', label: 'Firing / Layoff' },
  { id: 'breakup', label: 'Relationship Breakup' },
  { id: 'confrontation', label: 'Confronting a Friend' },
  { id: 'dispute', label: 'Landlord / Vendor Dispute' },
  { id: 'therapy', label: 'Therapy Prep' },
];

interface Props {
  onStart: () => void;
  onBack: () => void;
}

export function PreHardConversationScreen({ onStart, onBack }: Props) {
  const { hardConvoSetup, setHardConvoSetup } = useSessionStore();
  const [situationFocused, setSituationFocused] = useState(false);
  const [goalFocused, setGoalFocused] = useState(false);

  const canStart = !!hardConvoSetup.scenario;

  return (
    <View style={s.root}>
      <LinearGradient colors={['#160c22', '#050510']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          <View style={s.header}>
            <TouchableOpacity onPress={onBack} style={s.backBtn}>
              <Text style={s.backText}>← Back</Text>
            </TouchableOpacity>
            <View>
              <Text style={s.title}>Hard Conversations</Text>
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
              subtitle="Make the stakes and goal explicit before starting."
              items={[
                { label: 'Scenario', detail: hardConvoSetup.scenario ? 'Chosen' : 'Pick a scenario', ready: Boolean(hardConvoSetup.scenario) },
                { label: 'Situation', detail: hardConvoSetup.situation || 'Add the context', ready: Boolean(hardConvoSetup.situation.trim()) },
                { label: 'Goal', detail: hardConvoSetup.goal || 'Add your target outcome', ready: Boolean(hardConvoSetup.goal.trim()) },
              ]}
            />

            <View style={s.body}>
              <Text style={s.stepTitle}>What are you walking into?</Text>
              <Text style={s.stepDesc}>Pick the scenario so coaching fits the moment.</Text>

              <View style={s.field}>
                <Text style={s.fieldLabel}>Scenario *</Text>
                <View style={s.chipRow}>
                  {SCENARIOS.map((sc) => {
                    const active = hardConvoSetup.scenario === sc.id;
                    return (
                      <TouchableOpacity
                        key={sc.id}
                        onPress={() => setHardConvoSetup({ scenario: active ? null : sc.id })}
                        activeOpacity={0.8}
                        style={[s.chip, active && s.chipActive]}
                      >
                        <Text style={[s.chipText, active && s.chipTextActive]}>{sc.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={s.field}>
                <Text style={s.fieldLabel}>What's the situation?</Text>
                <TextInput
                  style={[s.input, situationFocused && s.inputFocused]}
                  placeholder="Asking for 20% raise after 2 years"
                  placeholderTextColor="#334155"
                  value={hardConvoSetup.situation}
                  onChangeText={(v) => setHardConvoSetup({ situation: v })}
                  onFocus={() => setSituationFocused(true)}
                  onBlur={() => setSituationFocused(false)}
                />
              </View>

              <View style={s.field}>
                <Text style={s.fieldLabel}>Your goal</Text>
                <TextInput
                  style={[s.input, goalFocused && s.inputFocused]}
                  placeholder="Get at least $15k increase or walk"
                  placeholderTextColor="#334155"
                  value={hardConvoSetup.goal}
                  onChangeText={(v) => setHardConvoSetup({ goal: v })}
                  onFocus={() => setGoalFocused(true)}
                  onBlur={() => setGoalFocused(false)}
                />
              </View>

              <View style={s.readyBox}>
                <Text style={s.readyIcon}>🔥</Text>
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
                colors={canStart ? ['#8b5cf6', '#7c3aed'] : ['#1e1e2e', '#1e1e2e']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.startGrad}
              >
                <Text style={[s.startText, !canStart && s.startTextDim]}>🔥 Start Session</Text>
              </LinearGradient>
            </TouchableOpacity>
            <Text style={s.footerHint}>
              {canStart ? 'Put phone in pocket · Wear AirPods · Go.' : 'Pick a scenario to begin'}
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
  backText: { color: '#8b5cf6', fontSize: 14, fontWeight: '600' },
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
  inputFocused: { borderColor: 'rgba(139,92,246,0.5)', backgroundColor: 'rgba(139,92,246,0.04)' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderColor: 'rgba(139,92,246,0.5)',
  },
  chipText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#8b5cf6' },

  readyBox: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)',
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
