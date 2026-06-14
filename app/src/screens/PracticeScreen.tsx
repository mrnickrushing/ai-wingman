import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ConversationMode } from '../types';

type PracticeScenario = {
  mode: ConversationMode;
  label: string;
  prompt: string;
  outcome: string;
  accent: string;
};

const SCENARIOS: PracticeScenario[] = [
  {
    mode: 'sales',
    label: 'Objection Drill',
    prompt: 'Handle price, timing, and decision-maker pushback without losing control.',
    outcome: 'Goal: earn a clear next step',
    accent: '#6366f1',
  },
  {
    mode: 'dating',
    label: 'First Date Warmup',
    prompt: 'Practice relaxed pacing, callbacks, and clean transitions.',
    outcome: 'Goal: stay present and build momentum',
    accent: '#ec4899',
  },
  {
    mode: 'pitching',
    label: 'Investor Q&A',
    prompt: 'Rehearse crisp answers around traction, market, team, and the ask.',
    outcome: 'Goal: sound concise under pressure',
    accent: '#f59e0b',
  },
  {
    mode: 'hard_conversations',
    label: 'Boundary Rehearsal',
    prompt: 'Prepare calm phrasing before a difficult conversation.',
    outcome: 'Goal: be direct without escalating',
    accent: '#8b5cf6',
  },
];

type Props = {
  onBack: () => void;
  onStartMode: (mode: ConversationMode) => void;
};

export function PracticeScreen({ onBack, onStartMode }: Props) {
  return (
    <View style={s.root}>
      <LinearGradient colors={['#090914', '#050510']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={onBack} style={s.backBtn} hitSlop={10}>
            <Text style={s.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={s.title}>Practice</Text>
          <View style={s.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.hero}>
            <Text style={s.heroTitle}>Rehearse before the real moment.</Text>
            <Text style={s.heroBody}>
              Pick a scenario, start a coached session, and let Wingman pressure-test your delivery.
            </Text>
          </View>

          {SCENARIOS.map((scenario) => (
            <TouchableOpacity
              key={scenario.label}
              onPress={() => onStartMode(scenario.mode)}
              activeOpacity={0.82}
              style={[s.card, { borderLeftColor: scenario.accent }]}
            >
              <View style={s.cardTop}>
                <Text style={s.cardTitle}>{scenario.label}</Text>
                <Text style={[s.cardAction, { color: scenario.accent }]}>Start</Text>
              </View>
              <Text style={s.cardPrompt}>{scenario.prompt}</Text>
              <Text style={s.cardOutcome}>{scenario.outcome}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050510' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: { minWidth: 64 },
  backText: { color: '#818cf8', fontSize: 15, fontWeight: '800' },
  title: { color: '#f8fafc', fontSize: 18, fontWeight: '900' },
  headerSpacer: { width: 64 },
  content: { paddingHorizontal: 18, paddingBottom: 42, gap: 12 },
  hero: {
    backgroundColor: 'rgba(99,102,241,0.11)',
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.22)',
    borderRadius: 8,
    padding: 18,
    gap: 8,
    marginBottom: 4,
  },
  heroTitle: { color: '#f8fafc', fontSize: 24, fontWeight: '900', lineHeight: 30 },
  heroBody: { color: '#cbd5e1', fontSize: 14, lineHeight: 21 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderLeftWidth: 3,
    borderRadius: 8,
    padding: 16,
    gap: 9,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '900', flex: 1 },
  cardAction: { fontSize: 13, fontWeight: '900' },
  cardPrompt: { color: '#cbd5e1', fontSize: 14, lineHeight: 20 },
  cardOutcome: { color: '#64748b', fontSize: 12, lineHeight: 17 },
});
