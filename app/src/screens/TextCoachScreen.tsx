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
  thread: string;
  latestMessage: string;
};

const TEMPLATES: Template[] = [
  {
    label: 'Flirty',
    relationship: 'Dating',
    tone: 'Playful',
    goal: 'Keep the conversation fun and move it forward.',
    length: 'balanced',
    thread: 'Them: We should grab drinks sometime.\nYou: For sure, that sounds fun.\nThem: What kind of place do you like?',
    latestMessage: 'What kind of place do you like?',
  },
  {
    label: 'Follow-up',
    relationship: 'Networking',
    tone: 'Professional',
    goal: 'Turn the chat into a concrete follow-up.',
    length: 'balanced',
    thread: 'Them: Great meeting you today. Let’s stay in touch.\nYou: Likewise, really enjoyed talking.\nThem: Send me your info when you get a chance.',
    latestMessage: 'Send me your info when you get a chance.',
  },
  {
    label: 'Polite decline',
    relationship: 'Friend / coworker',
    tone: 'Warm',
    goal: 'Say no without sounding cold.',
    length: 'short',
    thread: 'Them: Can you jump on a call tonight?\nYou: I’m tied up later.\nThem: It would only take a minute.',
    latestMessage: 'It would only take a minute.',
  },
  {
    label: 'Sales follow-up',
    relationship: 'Lead',
    tone: 'Direct',
    goal: 'Move the deal to a clear next step.',
    length: 'balanced',
    thread: 'Them: Thanks for the demo. We need to think about it.\nYou: Totally understand.\nThem: I’ll circle back next week.',
    latestMessage: 'I’ll circle back next week.',
  },
];

const TONES = ['Warm', 'Playful', 'Direct', 'Professional', 'Confident'] as const;
const LENGTHS: Array<{ label: string; value: 'short' | 'balanced' | 'warm' | 'direct' }> = [
  { label: 'Short', value: 'short' },
  { label: 'Balanced', value: 'balanced' },
  { label: 'Warm', value: 'warm' },
  { label: 'Direct', value: 'direct' },
];

type Props = {
  onBack: () => void;
};

export function TextCoachScreen({ onBack }: Props) {
  const [relationship, setRelationship] = useState('Dating');
  const [tone, setTone] = useState<(typeof TONES)[number]>('Warm');
  const [goal, setGoal] = useState('Draft a response that sounds natural.');
  const [thread, setThread] = useState('');
  const [latestMessage, setLatestMessage] = useState('');
  const [length, setLength] = useState<'short' | 'balanced' | 'warm' | 'direct'>('balanced');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<TextCoachSuggestion | null>(null);

  const toneHint = useMemo(() => {
    switch (tone) {
      case 'Playful': return 'Keep it light and human.';
      case 'Direct': return 'Cut filler and get to the point.';
      case 'Professional': return 'Polished, concise, and grounded.';
      case 'Confident': return 'Clear, calm, and self-assured.';
      default: return 'Friendly, natural, and easy to send.';
    }
  }, [tone]);

  const applyTemplate = (template: Template) => {
    setRelationship(template.relationship);
    setTone(template.tone as (typeof TONES)[number]);
    setGoal(template.goal);
    setLength(template.length);
    setThread(template.thread);
    setLatestMessage(template.latestMessage);
    setSuggestion(null);
    setError(null);
  };

  const handleGenerate = async () => {
    if (!thread.trim() && !latestMessage.trim()) {
      setError('Paste the thread or the latest message first.');
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
      <LinearGradient colors={['#090914', '#050510']} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Pressable onPress={onBack} style={s.backBtn} hitSlop={10}>
            <Text style={s.backText}>Back</Text>
          </Pressable>
          <View style={s.headerTitleWrap}>
            <Text style={s.title}>Text Coach</Text>
            <Text style={s.subtitle}>Paste the thread. Claude writes the reply.</Text>
          </View>
          <View style={s.headerSpacer} />
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex}>
          <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
            <View style={s.hero}>
              <View style={s.heroTop}>
                <View style={s.liveBadge}>
                  <View style={s.liveDot} />
                  <Text style={s.liveText}>READY</Text>
                </View>
                <Text style={s.heroMeta}>{toneHint}</Text>
              </View>
              <Text style={s.heroTitle}>Reply fast without sounding robotic.</Text>
              <Text style={s.heroBody}>
                Choose the relationship, paste the thread, and get a reply that fits the moment.
              </Text>
              <View style={s.templateRow}>
                {TEMPLATES.map((template) => (
                  <Pressable key={template.label} onPress={() => applyTemplate(template)} style={s.templatePill}>
                    <Text style={s.templateText}>{template.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Section title="Conversation context">
              <Field label="Relationship" value={relationship} onChangeText={setRelationship} placeholder="Dating, coworker, lead..." />
              <Field label="Goal" value={goal} onChangeText={setGoal} placeholder="Set a date, keep it warm, close the loop..." multiline />
              <Field label="Latest message" value={latestMessage} onChangeText={setLatestMessage} placeholder="Paste the last text you received" multiline />
              <Field label="Thread" value={thread} onChangeText={setThread} placeholder="Paste the thread for fuller context" multiline large />
            </Section>

            <Section title="Tone and length">
              <View style={s.chipRow}>
                {TONES.map((chip) => (
                  <Pressable
                    key={chip}
                    onPress={() => setTone(chip)}
                    style={[s.chip, tone === chip && s.chipActive]}
                  >
                    <Text style={[s.chipText, tone === chip && s.chipTextActive]}>{chip}</Text>
                  </Pressable>
                ))}
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

            <Pressable onPress={handleGenerate} disabled={loading} style={[s.primaryBtn, loading && s.primaryBtnDisabled]}>
              <Text style={s.primaryBtnText}>{loading ? 'Drafting reply...' : 'Draft reply'}</Text>
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
                  <View style={s.replyCard}>
                    <Text style={s.replyText}>{suggestion.bestReply}</Text>
                    <View style={s.replyActions}>
                      <Pressable onPress={() => shareReply(suggestion.bestReply)} style={s.replyAction}>
                        <Text style={s.replyActionText}>Share</Text>
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
                      <View style={s.avoidDot} />
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
  large,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
  large?: boolean;
}) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#64748b"
        multiline={multiline}
        style={[s.input, multiline && s.inputMultiline, large && s.inputLarge]}
        textAlignVertical={multiline ? 'top' : 'center'}
        autoCapitalize="sentences"
        autoCorrect
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
  backText: { color: '#818cf8', fontSize: 15, fontWeight: '800' },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  title: { color: '#f8fafc', fontSize: 18, fontWeight: '900' },
  subtitle: { color: '#94a3b8', fontSize: 11, marginTop: 2, textAlign: 'center' },
  headerSpacer: { minWidth: 60 },
  content: { paddingHorizontal: 18, paddingBottom: 116, gap: 16 },
  hero: {
    backgroundColor: 'rgba(99,102,241,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.22)',
    borderRadius: 10,
    padding: 16,
    gap: 10,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  heroMeta: { color: '#94a3b8', fontSize: 11, flex: 1, textAlign: 'right' },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(74,222,128,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.28)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80' },
  liveText: { color: '#4ade80', fontSize: 10, fontWeight: '900' },
  heroTitle: { color: '#f8fafc', fontSize: 26, lineHeight: 31, fontWeight: '900' },
  heroBody: { color: '#cbd5e1', fontSize: 14, lineHeight: 21 },
  templateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  templatePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  templateText: { color: '#e2e8f0', fontSize: 12, fontWeight: '700' },
  section: { gap: 10 },
  sectionTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '900' },
  sectionBody: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 14,
    gap: 12,
  },
  field: { gap: 8 },
  fieldLabel: { color: '#cbd5e1', fontSize: 12, fontWeight: '700' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 14,
  },
  inputMultiline: { minHeight: 92 },
  inputLarge: { minHeight: 158 },
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
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.72 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  errorCard: {
    borderRadius: 10,
    padding: 14,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    gap: 6,
  },
  errorTitle: { color: '#fecaca', fontSize: 14, fontWeight: '900' },
  errorText: { color: '#fecaca', fontSize: 13, lineHeight: 19 },
  replyCard: {
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.18)',
    borderRadius: 10,
    padding: 14,
    gap: 10,
  },
  replyText: { color: '#f8fafc', fontSize: 16, lineHeight: 23, fontWeight: '700' },
  replyActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  replyAction: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  replyActionText: { color: '#e2e8f0', fontSize: 12, fontWeight: '800' },
  alternateList: { gap: 10 },
  altCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
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
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  metaLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  metaValue: { color: '#f8fafc', fontSize: 13, lineHeight: 18, fontWeight: '700' },
  avoidRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  avoidDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#f59e0b', marginTop: 8 },
});
