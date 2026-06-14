import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ConversationMode } from '../types';

type Props = {
  mode: ConversationMode;
  title: string;
  goal?: string;
  context?: string;
  audience?: string;
};

function compact(value?: string): string {
  return value?.trim().replace(/\s+/g, ' ') ?? '';
}

function buildBrief(mode: ConversationMode, title: string, goal?: string, context?: string, audience?: string) {
  const who = compact(title) || 'the conversation';
  const target = compact(goal) || 'leave with a clear next step';
  const extra = compact(context);
  const room = compact(audience);

  if (mode === 'sales') {
    return {
      focus: `Anchor on ${target}.`,
      questions: [
        `What problem makes this urgent for ${who}?`,
        'Who else needs to agree before a next step is real?',
        'What would make the cost feel obviously worth it?',
      ],
      risks: [
        'Answering objections before diagnosing the real concern.',
        'Leaving without a dated next step.',
      ],
      fallback: 'Slow down, ask one clarifying question, then summarize their answer.',
    };
  }
  if (mode === 'dating') {
    return {
      focus: `Create easy momentum with ${who}.`,
      questions: [
        'What topic naturally gets them animated?',
        'Where can you add a callback from earlier?',
        'What is the smallest confident next step?',
      ],
      risks: [
        'Over-explaining instead of letting the moment breathe.',
        'Missing a clear signal because you are planning the next line.',
      ],
      fallback: 'Name the moment lightly, ask a warmer question, then listen.',
    };
  }
  if (mode === 'networking') {
    return {
      focus: `Find useful overlaps at ${who}.`,
      questions: [
        'What are they building or trying to solve right now?',
        'Who would be useful for them to meet?',
        'What follow-up would actually help?',
      ],
      risks: [
        'Staying too long in a low-fit conversation.',
        'Collecting names without a reason to follow up.',
      ],
      fallback: 'Trade one useful detail, ask for a follow-up, then move cleanly.',
    };
  }
  if (mode === 'pitching') {
    return {
      focus: `Make ${who} land for ${room || 'the room'}.`,
      questions: [
        'What is the single claim they must remember?',
        'Which metric proves traction fastest?',
        'What objection should you answer before Q&A?',
      ],
      risks: [
        'Rushing the ask or burying the strongest proof.',
        'Letting Q&A pull you away from the core narrative.',
      ],
      fallback: 'Return to problem, proof, ask. Keep the answer under 30 seconds.',
    };
  }
  return {
    focus: `Stay calm and move toward ${target}.`,
    questions: [
      'What outcome is acceptable before you start?',
      'What boundary needs to be said plainly?',
      'What would de-escalation sound like in one sentence?',
    ],
    risks: [
      'Defending every point instead of holding the main boundary.',
      'Letting emotion erase the next step.',
    ],
    fallback: 'Pause, reflect their point, then restate your boundary or ask.',
  };
}

export function ConversationPrepBrief({ mode, title, goal, context, audience }: Props) {
  const brief = useMemo(
    () => buildBrief(mode, title, goal, context, audience),
    [audience, context, goal, mode, title]
  );

  return (
    <View style={s.card}>
      <View style={s.header}>
        <Text style={s.kicker}>PREP AI</Text>
        <Text style={s.title}>{brief.focus}</Text>
      </View>
      <View style={s.grid}>
        <PrepSection label="Ask" items={brief.questions} />
        <PrepSection label="Watch" items={brief.risks} />
      </View>
      <View style={s.fallback}>
        <Text style={s.fallbackLabel}>Fallback line</Text>
        <Text style={s.fallbackText}>{brief.fallback}</Text>
      </View>
    </View>
  );
}

function PrepSection({ label, items }: { label: string; items: string[] }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionLabel}>{label}</Text>
      {items.map((item) => (
        <View key={item} style={s.itemRow}>
          <View style={s.dot} />
          <Text style={s.itemText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(99,102,241,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.22)',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginTop: 10,
  },
  header: { gap: 5 },
  kicker: { color: '#818cf8', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: '#f8fafc', fontSize: 15, fontWeight: '900', lineHeight: 20 },
  grid: { gap: 10 },
  section: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  sectionLabel: { color: '#c4b5fd', fontSize: 11, fontWeight: '900' },
  itemRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#818cf8', marginTop: 7 },
  itemText: { flex: 1, color: '#cbd5e1', fontSize: 12, lineHeight: 17 },
  fallback: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 10,
    gap: 4,
  },
  fallbackLabel: { color: '#64748b', fontSize: 10, fontWeight: '900' },
  fallbackText: { color: '#f8fafc', fontSize: 13, lineHeight: 19, fontWeight: '700' },
});
