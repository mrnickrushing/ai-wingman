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
          <View style={s.roleplayHero}>
            <LinearGradient colors={['rgba(139,92,246,0.24)', 'rgba(99,102,241,0.10)']} style={StyleSheet.absoluteFill} />
            <View style={s.roleplayHeroInner}>
              <Text style={s.roleplayLabel}>PRACTICE WITH CLAUDE</Text>
              <Text style={s.roleplayHeroTitle}>Full voice roleplay, no typing.</Text>
              <Text style={s.roleplayHeroBody}>
                Claude speaks through your AirPods while you answer naturally. Use it for sales, dating, networking, or hard conversations.
              </Text>
              <View style={s.roleplayHeroActions}>
                <TouchableOpacity onPress={() => onStartRoleplay('sales')} style={s.roleplayHeroPrimary} activeOpacity={0.82}>
                  <Text style={s.roleplayHeroPrimaryText}>Voice roleplay</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onStartMode('sales')} style={s.roleplayHeroSecondary} activeOpacity={0.82}>
                  <Text style={s.roleplayHeroSecondaryText}>Quick practice</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={s.hero}>
            <Text style={s.heroTitle}>Rehearse before the real moment.</Text>
            <Text style={s.heroBody}>
              Pick a scenario, start a coached session, or run Claude through a live roleplay.
            </Text>
            <View style={s.heroActions}>
              <TouchableOpacity onPress={() => onStartRoleplay('sales')} style={s.heroActionPrimary} activeOpacity={0.82}>
                <Text style={s.heroActionPrimaryText}>Roleplay</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onStartMode('sales')} style={s.heroActionSecondary} activeOpacity={0.82}>
                <Text style={s.heroActionSecondaryText}>Quick practice</Text>
              </TouchableOpacity>
            </View>
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

          <View style={s.roleplayCard}>
            <Text style={s.roleplayLabel}>ROLEPLAY</Text>
            <Text style={s.roleplayTitle}>Claude can play the other side.</Text>
            <Text style={s.roleplayBody}>
              Use it to rehearse sales objections, date pacing, networking intros, or hard conversations before the real thing.
            </Text>
            <View style={s.roleplayRow}>
              <TouchableOpacity onPress={() => onStartRoleplay('dating')} style={s.roleplayBtn} activeOpacity={0.82}>
                <Text style={s.roleplayBtnText}>Dating</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onStartRoleplay('networking')} style={s.roleplayBtn} activeOpacity={0.82}>
                <Text style={s.roleplayBtnText}>Networking</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onStartRoleplay('hard_conversations')} style={s.roleplayBtn} activeOpacity={0.82}>
                <Text style={s.roleplayBtnText}>Hard talk</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  content: { paddingHorizontal: 18, paddingBottom: 116, gap: 12 },
  roleplayHero: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.28)',
  },
  roleplayHeroInner: {
    padding: 18,
    gap: 10,
  },
  roleplayHeroTitle: { color: '#f8fafc', fontSize: 25, fontWeight: '900', lineHeight: 31 },
  roleplayHeroBody: { color: '#cbd5e1', fontSize: 14, lineHeight: 21 },
  roleplayHeroActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 4 },
  roleplayHeroPrimary: {
    minWidth: 128,
    flexGrow: 1,
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 13,
  },
  roleplayHeroPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  roleplayHeroSecondary: {
    minWidth: 128,
    flexGrow: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 13,
  },
  roleplayHeroSecondaryText: { color: '#e2e8f0', fontSize: 13, fontWeight: '900' },
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
  heroActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 4 },
  heroActionPrimary: {
    minWidth: 110,
    flexGrow: 1,
    backgroundColor: '#6366f1',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 13,
  },
  heroActionPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  heroActionSecondary: {
    minWidth: 110,
    flexGrow: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 13,
  },
  heroActionSecondaryText: { color: '#e2e8f0', fontSize: 13, fontWeight: '900' },
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
  roleplayCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 16,
    gap: 10,
  },
  roleplayLabel: { color: '#818cf8', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  roleplayTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '900' },
  roleplayBody: { color: '#cbd5e1', fontSize: 13, lineHeight: 19 },
  roleplayRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  roleplayBtn: {
    backgroundColor: 'rgba(129,140,248,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.2)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  roleplayBtnText: { color: '#e0e7ff', fontSize: 11, fontWeight: '900' },
});
