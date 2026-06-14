import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ConversationMode } from '../types';
import { useSessionStore } from '../store/sessionStore';
import {
  appendCustomPlaybook,
  loadCustomPlaybooks,
  saveCustomPlaybooks,
  type SavedPlaybook,
} from '../utils/playbookStorage';

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
  const [customPlaybooks, setCustomPlaybooks] = useState<SavedPlaybook[]>([]);
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customGoal, setCustomGoal] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [customMode, setCustomMode] = useState<ConversationMode>('sales');

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

  useEffect(() => {
    loadCustomPlaybooks().then(setCustomPlaybooks);
  }, []);

  const persistCustomPlaybooks = async (next: SavedPlaybook[]) => {
    setCustomPlaybooks(next);
    await saveCustomPlaybooks(next);
  };

  const applyPlaybook = (playbook: Playbook) => {
    playbook.apply();
    onStartMode(playbook.mode);
  };

  const saveCustomPlaybook = async (pinned = false) => {
    const title = customTitle.trim();
    if (!title) return;
    const next: SavedPlaybook = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      mode: customMode,
      description: customDescription.trim(),
      goal: customGoal.trim(),
      notes: customNotes.trim(),
      pinned,
      createdAt: new Date().toISOString(),
    };
    const list = await appendCustomPlaybook(next);
    setCustomPlaybooks(list);
    setCustomTitle('');
    setCustomDescription('');
    setCustomGoal('');
    setCustomNotes('');
  };

  const togglePin = async (id: string) => {
    const next = customPlaybooks.map((playbook) => (
      playbook.id === id ? { ...playbook, pinned: !playbook.pinned } : playbook
    ));
    await persistCustomPlaybooks(next);
  };

  const applyCustomPlaybook = (playbook: SavedPlaybook) => {
    switch (playbook.mode) {
      case 'sales':
        setSalesSetup({
          prospectName: playbook.title,
          company: playbook.description,
          callGoal: playbook.goal,
          objectionLibrary: playbook.notes,
        });
        break;
      case 'dating':
        setDatingSetup({
          name: playbook.title,
          intent: playbook.goal || playbook.description,
          profileUrl: playbook.notes,
        });
        break;
      case 'networking':
        setNetworkingSetup({
          eventName: playbook.title,
          attendees: playbook.description || playbook.notes,
        });
        break;
      case 'pitching':
        setPitchingSetup({
          title: playbook.title,
          audience: playbook.description,
          deck: [playbook.goal, playbook.notes].filter(Boolean).join('\n'),
        });
        break;
      case 'hard_conversations':
        setHardConvoSetup({
          scenario: 'confrontation',
          situation: playbook.title,
          goal: playbook.goal || playbook.description,
        });
        break;
    }
    onStartMode(playbook.mode);
  };

  const pinnedPlaybooks = useMemo(() => customPlaybooks.filter((playbook) => playbook.pinned), [customPlaybooks]);
  const unpinnedPlaybooks = useMemo(() => customPlaybooks.filter((playbook) => !playbook.pinned), [customPlaybooks]);

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

          <View style={s.customCard}>
            <Text style={s.sectionLabel}>CUSTOM PLAYBOOK</Text>
            <Text style={s.customTitle}>Save a reusable setup</Text>
            <TextInput
              value={customTitle}
              onChangeText={setCustomTitle}
              placeholder="Playbook name"
              placeholderTextColor="#475569"
              style={s.input}
            />
            <View style={s.modeRow}>
              {playbooks.map((playbook) => {
                const active = customMode === playbook.mode;
                return (
                  <TouchableOpacity
                    key={playbook.mode}
                    onPress={() => setCustomMode(playbook.mode)}
                    style={[s.modeChip, active && s.modeChipActive]}
                  >
                    <Text style={[s.modeChipText, active && s.modeChipTextActive]}>{playbook.title}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              value={customDescription}
              onChangeText={setCustomDescription}
              placeholder="Short description or audience"
              placeholderTextColor="#475569"
              style={s.input}
            />
            <TextInput
              value={customGoal}
              onChangeText={setCustomGoal}
              placeholder="Goal or outcome"
              placeholderTextColor="#475569"
              style={s.input}
            />
            <TextInput
              value={customNotes}
              onChangeText={setCustomNotes}
              placeholder="Notes, objections, or structure"
              placeholderTextColor="#475569"
              style={[s.input, s.inputMultiline]}
              multiline
            />
            <View style={s.customActions}>
              <TouchableOpacity
                onPress={() => void saveCustomPlaybook(false)}
                style={s.customSecondary}
                activeOpacity={0.82}
              >
                <Text style={s.customSecondaryText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void saveCustomPlaybook(true)}
                style={s.customPrimary}
                activeOpacity={0.82}
              >
                <Text style={s.customPrimaryText}>Save & pin</Text>
              </TouchableOpacity>
            </View>
          </View>

          {pinnedPlaybooks.length > 0 ? (
            <View style={s.sectionBlock}>
              <Text style={s.sectionLabel}>PINNED</Text>
              {pinnedPlaybooks.map((playbook) => (
                <TouchableOpacity
                  key={playbook.id}
                  onPress={() => applyCustomPlaybook(playbook)}
                  activeOpacity={0.82}
                  style={s.savedCard}
                >
                  <View style={s.savedTop}>
                    <Text style={s.savedTitle}>{playbook.title}</Text>
                    <TouchableOpacity onPress={() => void togglePin(playbook.id)}>
                      <Text style={s.savedPin}>Unpin</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={s.savedMeta}>{playbook.description || playbook.goal || 'Custom playbook'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {unpinnedPlaybooks.length > 0 ? (
            <View style={s.sectionBlock}>
              <Text style={s.sectionLabel}>CUSTOM SAVED</Text>
              {unpinnedPlaybooks.map((playbook) => (
                <View key={playbook.id} style={s.savedCard}>
                  <View style={s.savedTop}>
                    <Text style={s.savedTitle}>{playbook.title}</Text>
                    <TouchableOpacity onPress={() => void togglePin(playbook.id)}>
                      <Text style={s.savedPin}>Pin</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={s.savedMeta}>{playbook.description || playbook.goal || 'Custom playbook'}</Text>
                  <View style={s.savedActions}>
                    <TouchableOpacity onPress={() => applyCustomPlaybook(playbook)} style={s.savedAction}>
                      <Text style={s.savedActionText}>Use</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

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
  content: { paddingHorizontal: 18, paddingBottom: 116, gap: 12 },
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
  sectionBlock: { gap: 10 },
  sectionLabel: { color: '#64748b', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  customCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 16,
    gap: 10,
  },
  customTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '900' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 14,
  },
  inputMultiline: { minHeight: 88, textAlignVertical: 'top' },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  modeChipActive: {
    backgroundColor: 'rgba(99,102,241,0.18)',
    borderColor: 'rgba(99,102,241,0.45)',
  },
  modeChipText: { color: '#94a3b8', fontSize: 11, fontWeight: '800' },
  modeChipTextActive: { color: '#f8fafc' },
  customActions: { flexDirection: 'row', gap: 10 },
  customSecondary: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    paddingVertical: 12,
  },
  customSecondaryText: { color: '#e2e8f0', fontSize: 13, fontWeight: '800' },
  customPrimary: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    paddingVertical: 12,
  },
  customPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  savedCard: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 8,
    padding: 14,
    gap: 8,
  },
  savedTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  savedTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '900', flex: 1 },
  savedPin: { color: '#818cf8', fontSize: 12, fontWeight: '900' },
  savedMeta: { color: '#94a3b8', fontSize: 12, lineHeight: 18 },
  savedActions: { flexDirection: 'row', gap: 8 },
  savedAction: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  savedActionText: { color: '#e2e8f0', fontSize: 12, fontWeight: '800' },
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
