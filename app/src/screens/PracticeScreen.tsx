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
    mode: 'networking',
    label: 'Room Entry',
    prompt: 'Rehearse your intro, follow-up questions, and graceful exits.',
    outcome: 'Goal: leave with one strong connection',
    accent: '#22d3ee',
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
  onStartRoleplay: (mode: ConversationMode) => void;
};

export function PracticeScreen({ onBack, onStartMode, onStartRoleplay }: Props) {
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
          {/* Main hero — voice roleplay */}
          <View style={s.roleplayHero}>
            <LinearGradient
              colors={['rgba(139,92,246,0.22)', 'rgba(99,102,241,0.08)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={s.roleplayHeroInner}>
              <Text style={s.roleplayEyebrow}>VOICE ROLEPLAY</Text>
              <Text style={s.roleplayHeroTitle}>Practice with Claude before the real thing.</Text>
              <Text style={s.roleplayHeroBody}>
                Claude plays the other side — live and in your ear. Use it for sales objections, date pacing, networking intros, or hard conversations.
              </Text>
              <View style={s.roleplayHeroActions}>
                <TouchableOpacity onPress={() => onStartRoleplay('sales')} style={s.roleplayHeroPrimary} activeOpacity={0.82}>
                  <Text style={s.roleplayHeroPrimaryText}>Start roleplay</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onStartMode('sales')} style={s.roleplayHeroSecondary} activeOpacity={0.82}>
                  <Text style={s.roleplayHeroSecondaryText}>Quick practice</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Roleplay mode picker */}
          <View style={s.roleplayCard}>
            <Text style={s.roleplayLabel}>CHOOSE ROLEPLAY MODE</Text>
            <Text style={s.roleplayTitle}>Pick the conversation type.</Text>
            <View style={s.roleplayRow}>
              <TouchableOpacity onPress={() => onStartRoleplay('sales')} style={s.roleplayBtn} activeOpacity={0.82}>
                <Text style={s.roleplayBtnText}>Sales</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onStartRoleplay('dating')} style={s.roleplayBtn} activeOpacity={0.82}>
                <Text style={s.roleplayBtnText}>Dating</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onStartRoleplay('networking')} style={s.roleplayBtn} activeOpacity={0.82}>
                <Text style={s.roleplayBtnText}>Networking</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onStartRoleplay('pitching')} style={s.roleplayBtn} activeOpacity={0.82}>
                <Text style={s.roleplayBtnText}>Pitching</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onStartRoleplay('hard_conversations')} style={s.roleplayBtn} activeOpacity={0.82}>
                <Text style={s.roleplayBtnText}>Hard talk</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Scenario drills */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Scenario drills</Text>
            <Text style={s.sectionSub}>Quick coached sessions by situation</Text>
          </View>

          {SCENARIOS.map((scenario) => (
            <TouchableOpacity
              key={scenario.label}
              onPress={() => onStartMode(scenario.mode)}
              activeOpacity={0.82}
              style={[s.card, { borderLeftColor: scenario.accent }]}
            >
              <View style={s.cardTop}>
                <View style={[s.cardDot, { backgroundColor: scenario.accent }]} />
                <Text style={s.cardTitle}>{scenario.label}</Text>
                <Text style={[s.cardAction, { color: scenario.accent }]}>Start ›</Text>
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
  content: { paddingHorizontal: 18, paddingBottom: 120, gap: 12 },

  // Roleplay hero
  roleplayHero: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.26)',
  },
  roleplayHeroInner: {
    padding: 20,
    gap: 10,
  },
  roleplayEyebrow: {
    color: '#a78bfa',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  roleplayHeroTitle: { color: '#f8fafc', fontSize: 24, fontWeight: '900', lineHeight: 30 },
  roleplayHeroBody: { color: '#cbd5e1', fontSize: 13, lineHeight: 20 },
  roleplayHeroActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 4 },
  roleplayHeroPrimary: {
    minWidth: 128,
    flexGrow: 1,
    backgroundColor: '#8b5cf6',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 13,
  },
  roleplayHeroPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  roleplayHeroSecondary: {
    minWidth: 128,
    flexGrow: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 13,
  },
  roleplayHeroSecondaryText: { color: '#e2e8f0', fontSize: 14, fontWeight: '800' },

  // Roleplay mode card
  roleplayCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  roleplayLabel: { color: '#818cf8', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  roleplayTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '900' },
  roleplayRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  roleplayBtn: {
    backgroundColor: 'rgba(129,140,248,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.20)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  roleplayBtnText: { color: '#e0e7ff', fontSize: 12, fontWeight: '900' },

  // Section
  sectionHeader: { gap: 2, marginTop: 4 },
  sectionTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '900' },
  sectionSub: { color: '#64748b', fontSize: 12 },

  // Scenario cards
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderLeftWidth: 3,
    borderRadius: 10,
    padding: 16,
    gap: 8,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardDot: { width: 7, height: 7, borderRadius: 4 },
  cardTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '900', flex: 1 },
  cardAction: { fontSize: 13, fontWeight: '900' },
  cardPrompt: { color: '#cbd5e1', fontSize: 13, lineHeight: 19 },
  cardOutcome: { color: '#64748b', fontSize: 12, lineHeight: 17 },
});
