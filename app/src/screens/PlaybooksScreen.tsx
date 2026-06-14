import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ConversationMode } from '../types';
import { useSessionStore } from '../store/sessionStore';

type Playbook = {
  title: string;
  mode: ConversationMode;
  description: string;
  accent: string;
  apply: () => void;
};

type Props = {
  onBack: () => void;
  onStartMode: (mode: ConversationMode) => void;
};

export function PlaybooksScreen({ onBack, onStartMode }: Props) {
  const {
    setSalesSetup,
    setDatingSetup,
    setNetworkingSetup,
    setPitchingSetup,
    setHardConvoSetup,
  } = useSessionStore();

  const playbooks: Playbook[] = [
    {
      title: 'Cold Call Close',
      mode: 'sales',
      description: 'Qualify pain, handle price resistance, and ask for a calendar commitment.',
      accent: '#6366f1',
      apply: () => setSalesSetup({
        prospectName: 'Prospect',
        company: 'Target account',
        role: 'Decision maker',
        callGoal: 'Book a specific next meeting and confirm decision criteria.',
        objectionLibrary: [
          'Too expensive -> ask what ROI would justify it.',
          'Bad timing -> ask what has to change before they revisit.',
          'Need approval -> ask what they would recommend if it were their call.',
        ].join('\n'),
      }),
    },
    {
      title: 'First Date Momentum',
      mode: 'dating',
      description: 'Stay relaxed, ask better follow-ups, and avoid dead-air spirals.',
      accent: '#ec4899',
      apply: () => setDatingSetup({
        name: 'Date',
        intent: 'Create a relaxed conversation and earn a second plan.',
      }),
    },
    {
      title: 'Conference Connector',
      mode: 'networking',
      description: 'Open cleanly, log contacts, and leave with follow-up hooks.',
      accent: '#22d3ee',
      apply: () => setNetworkingSetup({
        eventName: 'Industry event',
        attendees: 'Founders, buyers, operators, investors',
      }),
    },
    {
      title: 'Investor Pitch',
      mode: 'pitching',
      description: 'Keep the story tight around problem, traction, market, team, and ask.',
      accent: '#f59e0b',
      apply: () => setPitchingSetup({
        title: 'Investor pitch',
        audience: 'Investors',
        deck: 'Problem, solution, market, traction, business model, team, ask',
      }),
    },
    {
      title: 'Ask For A Raise',
      mode: 'hard_conversations',
      description: 'Keep the conversation calm, specific, and anchored to outcomes.',
      accent: '#8b5cf6',
      apply: () => setHardConvoSetup({
        scenario: 'salary_negotiation',
        situation: 'Compensation conversation',
        goal: 'Ask for a clear raise number and next decision date.',
      }),
    },
  ];

  const applyPlaybook = (playbook: Playbook) => {
    playbook.apply();
    onStartMode(playbook.mode);
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={['#090914', '#050510']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={onBack} style={s.backBtn} hitSlop={10}>
            <Text style={s.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={s.title}>Playbooks</Text>
          <View style={s.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.hero}>
            <Text style={s.heroTitle}>Start with a proven setup.</Text>
            <Text style={s.heroBody}>
              Playbooks prefill context, goals, and coaching bias so you can start faster.
            </Text>
          </View>

          {playbooks.map((playbook) => (
            <TouchableOpacity
              key={playbook.title}
              onPress={() => applyPlaybook(playbook)}
              activeOpacity={0.82}
              style={[s.card, { borderLeftColor: playbook.accent }]}
            >
              <View style={s.cardTop}>
                <Text style={s.cardTitle}>{playbook.title}</Text>
                <Text style={[s.cardAction, { color: playbook.accent }]}>Use</Text>
              </View>
              <Text style={s.cardBody}>{playbook.description}</Text>
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
    backgroundColor: 'rgba(139,92,246,0.11)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.22)',
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
    gap: 8,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '900', flex: 1 },
  cardAction: { fontSize: 13, fontWeight: '900' },
  cardBody: { color: '#cbd5e1', fontSize: 14, lineHeight: 20 },
});
