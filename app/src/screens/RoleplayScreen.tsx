import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ConversationMode } from '../types';
import { fetchMemoryBrief, type MemorySnapshot } from '../services/memory';
import { getRoleplayTurn, type RoleplayTurn } from '../services/roleplay';

type RoleplayPreset = {
  mode: ConversationMode;
  title: string;
  scenario: string;
  goal: string;
  accent: string;
  context: string;
};

const PRESETS: Record<ConversationMode, RoleplayPreset> = {
  sales: {
    mode: 'sales',
    title: 'Sales objection drill',
    scenario: 'A prospect is pushing back on price and timing.',
    goal: 'Get to a clear next step without sounding pushy.',
    accent: '#6366f1',
    context: 'Sales call practice. Handle objections, keep control, and ask for commitment.',
  },
  dating: {
    mode: 'dating',
    title: 'First date rehearsal',
    scenario: 'The conversation is moving well and you want to keep momentum.',
    goal: 'Stay present, build connection, and set up a second date naturally.',
    accent: '#ec4899',
    context: 'Dating practice. Keep the tone relaxed, warm, and specific.',
  },
  networking: {
    mode: 'networking',
    title: 'Networking intro',
    scenario: 'You just met someone useful at an event and want to leave with a clean follow-up.',
    goal: 'Make the exchange feel natural and leave with a next step.',
    accent: '#22d3ee',
    context: 'Networking practice. Keep it concise and useful.',
  },
  pitching: {
    mode: 'pitching',
    title: 'Pitch Q&A',
    scenario: 'An investor is asking hard questions about traction and market size.',
    goal: 'Answer crisply and defend the story without rambling.',
    accent: '#f59e0b',
    context: 'Pitch practice. Keep answers focused, confident, and metric-driven.',
  },
  hard_conversations: {
    mode: 'hard_conversations',
    title: 'Boundary rehearsal',
    scenario: 'You need to be direct without escalating the conversation.',
    goal: 'State the boundary clearly and keep the tone calm.',
    accent: '#8b5cf6',
    context: 'Hard conversation practice. Stay grounded, direct, and respectful.',
  },
};

type Turn = {
  id: string;
  speaker: 'You' | 'Claude';
  text: string;
};

type Props = {
  onBack: () => void;
  mode: ConversationMode;
};

export function RoleplayScreen({ onBack, mode }: Props) {
  const preset = PRESETS[mode] ?? PRESETS.sales;
  const [memory, setMemory] = useState<MemorySnapshot | null>(null);
  const [message, setMessage] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMemoryBrief().then(setMemory).catch(() => setMemory(null));
  }, []);

  const memoryContext = useMemo(() => {
    const items = [
      memory?.memory.interests?.length ? `Interests: ${memory.memory.interests.join('; ')}` : null,
      memory?.memory.personalDetails?.length ? `Personal details: ${memory.memory.personalDetails.join('; ')}` : null,
      memory?.memory.callbackTopics?.length ? `Callbacks: ${memory.memory.callbackTopics.join('; ')}` : null,
      memory?.brief?.nextMove ? `Next move: ${memory.brief.nextMove}` : null,
    ].filter(Boolean);
    return items.join('\n');
  }, [memory]);

  const startRoleplay = async () => {
    setLoading(true);
    setError(null);
    try {
      const turn = await getRoleplayTurn({
        mode: preset.mode,
        scenario: preset.scenario,
        goal: preset.goal,
        context: [preset.context, memoryContext].filter(Boolean).join('\n'),
        memory: memory?.memory ?? { interests: [], personalDetails: [], callbackTopics: [] },
        transcript: turns.map((turn) => `${turn.speaker}: ${turn.text}`).join('\n'),
        userMessage: started ? message.trim() : 'Start the roleplay with a realistic opener.',
        turnCount: turns.length,
      });
      setTurns([
        ...turns,
        {
          id: `${Date.now()}-claude`,
          speaker: 'Claude',
          text: turn.assistantReply || 'Alright.',
        },
      ]);
      setStarted(true);
      setMessage(turn.followUpQuestion || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start roleplay.');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    const text = message.trim();
    if (!text) return;
    setLoading(true);
    setError(null);
    const nextTurns = [...turns, { id: `${Date.now()}-you`, speaker: 'You' as const, text }];
    setTurns(nextTurns);
    setMessage('');
    try {
      const turn = await getRoleplayTurn({
        mode: preset.mode,
        scenario: preset.scenario,
        goal: preset.goal,
        context: [preset.context, memoryContext].filter(Boolean).join('\n'),
        memory: memory?.memory ?? { interests: [], personalDetails: [], callbackTopics: [] },
        transcript: nextTurns.map((turn) => `${turn.speaker}: ${turn.text}`).join('\n'),
        userMessage: text,
        turnCount: nextTurns.length,
      });
      setTurns([
        ...nextTurns,
        {
          id: `${Date.now()}-claude`,
          speaker: 'Claude',
          text: turn.assistantReply,
        },
      ]);
      setMessage(turn.followUpQuestion || '');
      setStarted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not continue roleplay.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={['#090914', '#050510']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Pressable onPress={onBack} style={s.backBtn} hitSlop={10}>
            <Text style={s.backText}>Back</Text>
          </Pressable>
          <View style={s.headerCopy}>
            <Text style={s.title}>Roleplay</Text>
            <Text style={s.subtitle}>{preset.title}</Text>
          </View>
          <View style={s.headerSpacer} />
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex}>
          <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
            <View style={[s.hero, { borderLeftColor: preset.accent }]}>
              <Text style={s.heroTitle}>{preset.scenario}</Text>
              <Text style={s.heroBody}>{preset.goal}</Text>
              {memory?.brief ? (
                <View style={s.memoryCard}>
                  <Text style={s.memoryLabel}>Memory brief</Text>
                  <Text style={s.memoryText}>{memory.brief.summary}</Text>
                  <Text style={s.memoryNext}>Next move: {memory.brief.nextMove}</Text>
                </View>
              ) : null}
            </View>

            <View style={s.chatCard}>
              <Text style={s.sectionLabel}>Conversation</Text>
              {turns.length === 0 ? (
                <Text style={s.emptyText}>Tap start to have Claude play the other side of the conversation.</Text>
              ) : (
                turns.map((turn) => (
                  <View key={turn.id} style={[s.bubble, turn.speaker === 'You' ? s.userBubble : s.claudeBubble]}>
                    <Text style={s.speaker}>{turn.speaker}</Text>
                    <Text style={s.bubbleText}>{turn.text}</Text>
                  </View>
                ))
              )}
            </View>

            {error ? (
              <View style={s.errorCard}>
                <Text style={s.errorTitle}>Roleplay error</Text>
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={s.footer}>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder={started ? 'Type your reply…' : 'Tap start or type your opener…'}
              placeholderTextColor="#64748b"
              style={s.input}
              multiline
            />
            <View style={s.actions}>
              <Pressable onPress={startRoleplay} disabled={loading} style={[s.secondaryBtn, loading && s.disabled]}>
                <Text style={s.secondaryBtnText}>{started ? 'Refresh roleplay' : 'Start roleplay'}</Text>
              </Pressable>
              <Pressable onPress={sendMessage} disabled={loading || !message.trim()} style={[s.primaryBtn, (loading || !message.trim()) && s.disabled]}>
                <Text style={s.primaryBtnText}>{loading ? 'Thinking…' : 'Send'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  headerCopy: { flex: 1, alignItems: 'center' },
  title: { color: '#f8fafc', fontSize: 18, fontWeight: '900' },
  subtitle: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  headerSpacer: { width: 64 },
  flex: { flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 120, gap: 12 },
  hero: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderLeftWidth: 3,
    borderRadius: 8,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroTitle: { color: '#f8fafc', fontSize: 22, fontWeight: '900', lineHeight: 28 },
  heroBody: { color: '#cbd5e1', fontSize: 14, lineHeight: 20 },
  memoryCard: {
    backgroundColor: 'rgba(99,102,241,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.18)',
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  memoryLabel: { color: '#818cf8', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  memoryText: { color: '#e2e8f0', fontSize: 13, lineHeight: 18 },
  memoryNext: { color: '#f8fafc', fontSize: 12, fontWeight: '800' },
  chatCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 8,
    padding: 14,
    gap: 10,
  },
  sectionLabel: { color: '#64748b', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  emptyText: { color: '#94a3b8', fontSize: 13, lineHeight: 18 },
  bubble: {
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  userBubble: { backgroundColor: 'rgba(99,102,241,0.15)', alignSelf: 'flex-end' },
  claudeBubble: { backgroundColor: 'rgba(255,255,255,0.04)', alignSelf: 'flex-start' },
  speaker: { color: '#94a3b8', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  bubbleText: { color: '#f8fafc', fontSize: 14, lineHeight: 20 },
  errorCard: {
    backgroundColor: 'rgba(244,63,94,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.2)',
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  errorTitle: { color: '#fecdd3', fontSize: 13, fontWeight: '900' },
  errorText: { color: '#fecdd3', fontSize: 12, lineHeight: 17 },
  footer: {
    paddingHorizontal: 18,
    paddingBottom: 20,
    gap: 10,
    backgroundColor: '#050510',
  },
  input: {
    minHeight: 84,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    color: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', gap: 10 },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  secondaryBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  secondaryBtnText: { color: '#e2e8f0', fontSize: 13, fontWeight: '900' },
  disabled: { opacity: 0.5 },
});
