import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { suggestTextReply, type TextCoachSuggestion } from '../services/textCoach';

type Template = {
  label: string;
  relationship: string;
  tone: string;
  goal: string;
  length: 'short' | 'balanced' | 'warm' | 'direct';
  messages: ThreadMessage[];
};

type ThreadMessage = {
  id: string;
  sender: 'them' | 'you';
  text: string;
};

const TEMPLATES: Template[] = [
  {
    label: 'Flirty',
    relationship: 'Dating',
    tone: 'Playful',
    goal: 'Keep the conversation fun and move it toward a real plan.',
    length: 'balanced',
    messages: [
      { id: 'flirty-1', sender: 'them', text: 'We should grab drinks sometime.' },
      { id: 'flirty-2', sender: 'you', text: 'For sure, that sounds fun.' },
      { id: 'flirty-3', sender: 'them', text: 'What kind of place do you like?' },
    ],
  },
  {
    label: 'Follow-up',
    relationship: 'Networking',
    tone: 'Professional',
    goal: 'Turn the conversation into a concrete next step.',
    length: 'balanced',
    messages: [
      { id: 'follow-1', sender: 'them', text: 'Great meeting you today. Let’s stay in touch.' },
      { id: 'follow-2', sender: 'you', text: 'Likewise, really enjoyed talking.' },
      { id: 'follow-3', sender: 'them', text: 'Send me your info when you get a chance.' },
    ],
  },
  {
    label: 'Polite decline',
    relationship: 'Friend / coworker',
    tone: 'Warm',
    goal: 'Say no clearly without sounding cold or defensive.',
    length: 'short',
    messages: [
      { id: 'decline-1', sender: 'them', text: 'Can you jump on a call tonight?' },
      { id: 'decline-2', sender: 'you', text: 'I’m tied up later.' },
      { id: 'decline-3', sender: 'them', text: 'It would only take a minute.' },
    ],
  },
  {
    label: 'Sales follow-up',
    relationship: 'Lead',
    tone: 'Direct',
    goal: 'Move the deal toward a specific next step.',
    length: 'balanced',
    messages: [
      { id: 'sales-1', sender: 'them', text: 'Thanks for the demo. We need to think about it.' },
      { id: 'sales-2', sender: 'you', text: 'Totally understand.' },
      { id: 'sales-3', sender: 'them', text: 'I’ll circle back next week.' },
    ],
  },
];

const TONES = ['Warm', 'Playful', 'Direct', 'Professional', 'Confident'] as const;
const LENGTHS: Array<{ label: string; value: 'short' | 'balanced' | 'warm' | 'direct' }> = [
  { label: 'Short', value: 'short' },
  { label: 'Balanced', value: 'balanced' },
  { label: 'Warm', value: 'warm' },
  { label: 'Direct', value: 'direct' },
];

const TONE_COLORS: Record<string, string> = {
  Warm: '#ec4899',
  Playful: '#f59e0b',
  Direct: '#22d3ee',
  Professional: '#6366f1',
  Confident: '#8b5cf6',
};

type Props = {
  onBack: () => void;
};

function buildThread(messages: ThreadMessage[]) {
  return messages
    .map((message) => `${message.sender === 'them' ? 'Them' : 'You'}: ${message.text.trim()}`)
    .join('\n');
}

function getLatestMessage(messages: ThreadMessage[]) {
  const latestIncoming = [...messages].reverse().find((message) => message.sender === 'them' && message.text.trim());
  return latestIncoming?.text.trim() ?? messages.at(-1)?.text.trim() ?? '';
}

function messageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function TextCoachScreen({ onBack }: Props) {
  const [relationship, setRelationship] = useState('Dating');
  const [tone, setTone] = useState<(typeof TONES)[number]>('Warm');
  const [goal, setGoal] = useState('Draft a response that sounds natural and actually gets sent.');
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [composer, setComposer] = useState('');
  const [composerSender, setComposerSender] = useState<'them' | 'you'>('them');
  const [length, setLength] = useState<'short' | 'balanced' | 'warm' | 'direct'>('balanced');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<TextCoachSuggestion | null>(null);

  const activeToneColor = TONE_COLORS[tone] ?? '#6366f1';
  const thread = useMemo(() => buildThread(messages), [messages]);
  const latestMessage = useMemo(() => getLatestMessage(messages), [messages]);

  const toneHint = useMemo(() => {
    switch (tone) {
      case 'Playful':
        return 'Keep it flirty, alive, and easy to respond to.';
      case 'Direct':
        return 'Trim filler and land the point cleanly.';
      case 'Professional':
        return 'Sound polished, calm, and useful.';
      case 'Confident':
        return 'Lead the exchange without sounding try-hard.';
      default:
        return 'Friendly, natural, and worth replying to.';
    }
  }, [tone]);

  const applyTemplate = (template: Template) => {
    setRelationship(template.relationship);
    setTone(template.tone as (typeof TONES)[number]);
    setGoal(template.goal);
    setLength(template.length);
    setMessages(template.messages);
    setComposer('');
    setComposerSender('them');
    setSuggestion(null);
    setError(null);
  };

  const addMessage = () => {
    const text = composer.trim();
    if (!text) return;
    setMessages((current) => [...current, { id: messageId(), sender: composerSender, text }]);
    setComposer('');
    setSuggestion(null);
    setError(null);
  };

  const removeMessage = (id: string) => {
    setMessages((current) => current.filter((message) => message.id !== id));
    setSuggestion(null);
  };

  const clearThread = () => {
    setMessages([]);
    setComposer('');
    setSuggestion(null);
    setError(null);
  };

  const handleGenerate = async () => {
    if (!messages.length) {
      setError('Build the text thread first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await suggestTextReply({
        thread,
        latestMessage,
        goal,
        relationship,
        tone,
        length,
      });
      setSuggestion(result.suggestion);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not draft a reply.');
    } finally {
      setLoading(false);
    }
  };

  const shareReply = async (reply: string) => {
    try {
      await Share.share({ message: reply });
    } catch {
      Alert.alert('Share failed', 'Could not open the share sheet.');
    }
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={['#060612', '#03030a']} style={StyleSheet.absoluteFill} />
      <View style={[s.ambientGlow, { backgroundColor: `${activeToneColor}16` }]} pointerEvents="none" />

      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Pressable onPress={onBack} style={s.backBtn} hitSlop={10}>
            <Text style={s.backText}>‹ Back</Text>
          </Pressable>
          <View style={s.headerTitleWrap}>
            <Text style={s.title}>Text Coach</Text>
            <Text style={s.subtitle}>Build the thread like iMessage. Claude handles the reply.</Text>
          </View>
          <View style={s.headerSpacer} />
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex}>
          <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
            <LinearGradient
              colors={[`${activeToneColor}22`, 'rgba(8,8,18,0.96)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[s.hero, { borderColor: `${activeToneColor}30` }]}
            >
              <View style={s.heroTop}>
                <View style={[s.liveBadge, { backgroundColor: `${activeToneColor}18`, borderColor: `${activeToneColor}40` }]}>
                  <View style={[s.liveDot, { backgroundColor: activeToneColor }]} />
                  <Text style={[s.liveText, { color: activeToneColor }]}>TEXT READY</Text>
                </View>
                <Text style={s.heroMeta}>{toneHint}</Text>
              </View>
              <Text style={s.heroTitle}>Make the thread feel real before you draft the reply.</Text>
              <Text style={s.heroBody}>
                Add each text as a bubble, keep the tone dialed in, then have Claude write something worth sending.
              </Text>
              <View style={s.templateRow}>
                {TEMPLATES.map((template) => (
                  <Pressable key={template.label} onPress={() => applyTemplate(template)} style={s.templatePill}>
                    <Text style={s.templateText}>{template.label}</Text>
                  </Pressable>
                ))}
              </View>
            </LinearGradient>

            <Section title="Thread setup">
              <Field
                label="Relationship"
                value={relationship}
                onChangeText={setRelationship}
                placeholder="Dating, lead, friend, coworker..."
                accentColor={activeToneColor}
              />
              <Field
                label="Goal"
                value={goal}
                onChangeText={setGoal}
                placeholder="Keep momentum, set a time, say no warmly..."
                multiline
                accentColor={activeToneColor}
              />
            </Section>

            <Section title="Conversation thread">
              <View style={s.threadShell}>
                <View style={s.threadHeader}>
                  <View>
                    <Text style={s.threadName}>{relationship || 'Conversation'}</Text>
                    <Text style={s.threadMeta}>{messages.length ? `${messages.length} message${messages.length === 1 ? '' : 's'}` : 'Start the thread below'}</Text>
                  </View>
                  {messages.length ? (
                    <Pressable onPress={clearThread} style={s.clearBtn}>
                      <Text style={s.clearBtnText}>Clear</Text>
                    </Pressable>
                  ) : null}
                </View>

                <View style={s.imessageSurface}>
                  {messages.length ? (
                    messages.map((message) => (
                      <Pressable
                        key={message.id}
                        onLongPress={() => removeMessage(message.id)}
                        style={[
                          s.bubbleRow,
                          message.sender === 'you' ? s.bubbleRowRight : s.bubbleRowLeft,
                        ]}
                      >
                        <View
                          style={[
                            s.bubble,
                            message.sender === 'you'
                              ? [s.bubbleOutgoing, { backgroundColor: activeToneColor }]
                              : s.bubbleIncoming,
                          ]}
                        >
                          <Text style={[s.bubbleText, message.sender === 'you' && s.bubbleTextOutgoing]}>
                            {message.text}
                          </Text>
                        </View>
                      </Pressable>
                    ))
                  ) : (
                    <View style={s.emptyThread}>
                      <Text style={s.emptyThreadTitle}>No messages yet</Text>
                      <Text style={s.emptyThreadBody}>Use the composer below to add the thread one bubble at a time.</Text>
                    </View>
                  )}
                </View>

                <View style={s.composerPanel}>
                  <View style={s.senderRow}>
                    <Pressable
                      onPress={() => setComposerSender('them')}
                      style={[s.senderChip, composerSender === 'them' && s.senderChipActive]}
                    >
                      <Text style={[s.senderChipText, composerSender === 'them' && s.senderChipTextActive]}>Them</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setComposerSender('you')}
                      style={[s.senderChip, composerSender === 'you' && s.senderChipOutgoing]}
                    >
                      <Text style={[s.senderChipText, composerSender === 'you' && s.senderChipTextOutgoing]}>You</Text>
                    </Pressable>
                  </View>
                  <View style={s.composerRow}>
                    <TextInput
                      value={composer}
                      onChangeText={setComposer}
                      placeholder={composerSender === 'them' ? 'Add their latest message…' : 'Add your draft or reply…'}
                      placeholderTextColor="#7b879c"
                      style={s.composerInput}
                      multiline
                      textAlignVertical="top"
                      autoCapitalize="sentences"
                      autoCorrect
                    />
                    <Pressable
                      onPress={addMessage}
                      disabled={!composer.trim()}
                      style={[s.sendBtn, { backgroundColor: composer.trim() ? activeToneColor : 'rgba(255,255,255,0.08)' }]}
                    >
                      <Text style={s.sendBtnText}>Add</Text>
                    </Pressable>
                  </View>
                  <Text style={s.composerHint}>Long-press any bubble to remove it.</Text>
                </View>
              </View>
            </Section>

            <Section title="Tone and length">
              <View style={s.chipRow}>
                {TONES.map((chip) => {
                  const chipColor = TONE_COLORS[chip] ?? '#6366f1';
                  return (
                    <Pressable
                      key={chip}
                      onPress={() => setTone(chip)}
                      style={[s.chip, tone === chip && { backgroundColor: `${chipColor}20`, borderColor: `${chipColor}55` }]}
                    >
                      <Text style={[s.chipText, tone === chip && { color: chipColor }]}>{chip}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={s.chipRow}>
                {LENGTHS.map((chip) => (
                  <Pressable
                    key={chip.value}
                    onPress={() => setLength(chip.value)}
                    style={[s.chip, length === chip.value && s.chipActive]}
                  >
                    <Text style={[s.chipText, length === chip.value && s.chipTextActive]}>{chip.label}</Text>
                  </Pressable>
                ))}
              </View>
            </Section>

            <Pressable
              onPress={handleGenerate}
              disabled={loading}
              style={[s.primaryBtn, { backgroundColor: activeToneColor }, loading && s.primaryBtnDisabled]}
            >
              <Text style={s.primaryBtnText}>{loading ? 'Drafting reply…' : 'Draft reply from this thread'}</Text>
            </Pressable>

            {error ? (
              <View style={s.errorCard}>
                <Text style={s.errorTitle}>Could not draft reply</Text>
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            {suggestion ? (
              <>
                <Section title="Best reply">
                  <View style={[s.replyCard, { borderColor: `${activeToneColor}30`, backgroundColor: `${activeToneColor}10` }]}>
                    <Text style={s.replyText}>{suggestion.bestReply}</Text>
                    <View style={s.replyActions}>
                      <Pressable
                        onPress={() => shareReply(suggestion.bestReply)}
                        style={[s.replyAction, { backgroundColor: `${activeToneColor}18`, borderColor: `${activeToneColor}30` }]}
                      >
                        <Text style={[s.replyActionText, { color: activeToneColor }]}>Share</Text>
                      </Pressable>
                    </View>
                  </View>
                </Section>

                <Section title="Alternates">
                  <View style={s.alternateList}>
                    {suggestion.alternateReplies.map((reply) => (
                      <View key={`${reply.label}-${reply.text}`} style={s.altCard}>
                        <View style={s.altHeader}>
                          <Text style={s.altLabel}>{reply.label}</Text>
                          <Pressable onPress={() => shareReply(reply.text)} style={s.altAction}>
                            <Text style={s.altActionText}>Share</Text>
                          </Pressable>
                        </View>
                        <Text style={s.altText}>{reply.text}</Text>
                      </View>
                    ))}
                  </View>
                </Section>

                <Section title="Why this works">
                  <Text style={s.bodyText}>{suggestion.rationale}</Text>
                  <View style={s.metaRow}>
                    <Meta label="Next move" value={suggestion.nextMove} />
                    <Meta label="Confidence" value={`${Math.round(suggestion.confidence)}%`} />
                  </View>
                </Section>

                <Section title="What to avoid">
                  {suggestion.whatToAvoid.map((item) => (
                    <View key={item} style={s.avoidRow}>
                      <View style={[s.avoidDot, { backgroundColor: activeToneColor }]} />
                      <Text style={s.bodyText}>{item}</Text>
                    </View>
                  ))}
                </Section>
              </>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionBody}>{children}</View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  accentColor,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
  accentColor?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#64748b"
        multiline={multiline}
        style={[
          s.input,
          multiline && s.inputMultiline,
          focused && accentColor && { borderColor: `${accentColor}55`, backgroundColor: `${accentColor}08` },
        ]}
        textAlignVertical={multiline ? 'top' : 'center'}
        autoCapitalize="sentences"
        autoCorrect
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.metaCard}>
      <Text style={s.metaLabel}>{label}</Text>
      <Text style={s.metaValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050510' },
  safe: { flex: 1 },
  flex: { flex: 1 },
  ambientGlow: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    top: -90,
    right: -100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 10,
  },
  backBtn: { minWidth: 60 },
  backText: { color: '#a5b4fc', fontSize: 15, fontWeight: '800' },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  title: { color: '#f8fafc', fontSize: 18, fontWeight: '900' },
  subtitle: { color: '#94a3b8', fontSize: 11, marginTop: 2, textAlign: 'center' },
  headerSpacer: { minWidth: 60 },
  content: { paddingHorizontal: 18, paddingBottom: 116, gap: 16 },
  hero: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 10,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  heroMeta: { color: '#94a3b8', fontSize: 11, flex: 1, textAlign: 'right' },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 10, fontWeight: '900' },
  heroTitle: { color: '#f8fafc', fontSize: 26, lineHeight: 31, fontWeight: '900' },
  heroBody: { color: '#cbd5e1', fontSize: 14, lineHeight: 21 },
  templateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  templatePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  templateText: { color: '#e2e8f0', fontSize: 12, fontWeight: '700' },
  section: { gap: 10 },
  sectionTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '900' },
  sectionBody: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  field: { gap: 8 },
  fieldLabel: { color: '#cbd5e1', fontSize: 12, fontWeight: '700' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 14,
  },
  inputMultiline: { minHeight: 92 },
  threadShell: { gap: 12 },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  threadName: { color: '#f8fafc', fontSize: 16, fontWeight: '900' },
  threadMeta: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  clearBtnText: { color: '#cbd5e1', fontSize: 11, fontWeight: '800' },
  imessageSurface: {
    backgroundColor: '#020208',
    borderRadius: 22,
    padding: 14,
    minHeight: 280,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 10,
  },
  bubbleRow: {
    width: '100%',
    flexDirection: 'row',
  },
  bubbleRowLeft: { justifyContent: 'flex-start' },
  bubbleRowRight: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '82%',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleIncoming: {
    backgroundColor: '#2b2b30',
    borderTopLeftRadius: 8,
  },
  bubbleOutgoing: {
    borderTopRightRadius: 8,
  },
  bubbleText: { color: '#f8fafc', fontSize: 15, lineHeight: 20, fontWeight: '600' },
  bubbleTextOutgoing: { color: '#ffffff' },
  emptyThread: {
    flex: 1,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyThreadTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '900' },
  emptyThreadBody: { color: '#94a3b8', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  composerPanel: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  senderRow: { flexDirection: 'row', gap: 8 },
  senderChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  senderChipActive: {
    backgroundColor: '#3a3a42',
    borderColor: '#52525b',
  },
  senderChipOutgoing: {
    backgroundColor: '#0a84ff',
    borderColor: '#4da2ff',
  },
  senderChipText: { color: '#cbd5e1', fontSize: 12, fontWeight: '800' },
  senderChipTextActive: { color: '#f8fafc' },
  senderChipTextOutgoing: { color: '#ffffff' },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  composerInput: {
    flex: 1,
    minHeight: 54,
    maxHeight: 130,
    borderRadius: 18,
    backgroundColor: '#11111a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    color: '#f8fafc',
    fontSize: 15,
    lineHeight: 20,
  },
  sendBtn: {
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  sendBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '900' },
  composerHint: { color: '#94a3b8', fontSize: 11 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chipActive: {
    backgroundColor: 'rgba(99,102,241,0.2)',
    borderColor: 'rgba(129,140,248,0.36)',
  },
  chipText: { color: '#cbd5e1', fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#f8fafc' },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.72 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  errorCard: {
    borderRadius: 12,
    padding: 14,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    gap: 6,
  },
  errorTitle: { color: '#fecaca', fontSize: 14, fontWeight: '900' },
  errorText: { color: '#fecaca', fontSize: 13, lineHeight: 19 },
  replyCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  replyText: { color: '#f8fafc', fontSize: 16, lineHeight: 23, fontWeight: '700' },
  replyActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  replyAction: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 999,
  },
  replyActionText: { fontSize: 12, fontWeight: '800' },
  alternateList: { gap: 10 },
  altCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 13,
    gap: 8,
  },
  altHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  altLabel: { color: '#f8fafc', fontSize: 13, fontWeight: '900', textTransform: 'capitalize' },
  altAction: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  altActionText: { color: '#e2e8f0', fontSize: 11, fontWeight: '800' },
  altText: { color: '#cbd5e1', fontSize: 14, lineHeight: 20 },
  bodyText: { color: '#cbd5e1', fontSize: 14, lineHeight: 21 },
  metaRow: { flexDirection: 'row', gap: 10 },
  metaCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  metaLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  metaValue: { color: '#f8fafc', fontSize: 13, lineHeight: 18, fontWeight: '700' },
  avoidRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  avoidDot: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
});
