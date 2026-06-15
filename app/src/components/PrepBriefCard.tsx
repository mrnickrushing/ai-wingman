import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ConversationMode, SessionRecap } from '../types';

type Props = {
  latestRecap?: SessionRecap | null;
  onResumeMode?: (mode: ConversationMode) => void;
};

const MODE_ACCENT: Record<ConversationMode, string> = {
  sales: '#6366f1',
  dating: '#ec4899',
  networking: '#22d3ee',
  pitching: '#f59e0b',
  hard_conversations: '#8b5cf6',
};

function modeLabel(mode?: ConversationMode | null): string {
  switch (mode) {
    case 'dating': return '💘 Dating';
    case 'networking': return '🤝 Networking';
    case 'pitching': return '🚀 Pitching';
    case 'hard_conversations': return '🔥 Hard Talk';
    case 'sales':
    default:
      return '💼 Sales';
  }
}

export function PrepBriefCard({ latestRecap, onResumeMode }: Props) {
  const brief = useMemo(() => {
    if (!latestRecap) {
      return {
        title: 'Build your first prep brief',
        body: 'Run a session and Wingman will remember what mattered, what broke, and what to tighten next time.',
        next: 'Start a mode to create memory.',
      };
    }

    const nextStep = latestRecap.followUps?.[0]?.text
      ?? latestRecap.improvements?.[0]
      ?? latestRecap.highlights[0]
      ?? latestRecap.summary;
    return {
      title: `${modeLabel(latestRecap.mode)} prep brief`,
      body: latestRecap.summary,
      next: nextStep,
    };
  }, [latestRecap]);

  const accent = latestRecap?.mode ? MODE_ACCENT[latestRecap.mode] : '#6366f1';

  return (
    <LinearGradient
      colors={[accent + '18', accent + '06']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={[s.card, { borderColor: accent + '30' }]}
    >
      <View style={s.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={[s.kickerPill, { backgroundColor: accent + '20', borderColor: accent + '40' }]}>
            <Text style={[s.kicker, { color: accent }]}>PREP BRIEF</Text>
          </View>
          <Text style={s.title}>{brief.title}</Text>
        </View>
        {latestRecap && onResumeMode ? (
          <TouchableOpacity onPress={() => onResumeMode(latestRecap.mode)} style={[s.resumeBtn, { borderColor: accent + '40', backgroundColor: accent + '14' }]} activeOpacity={0.8}>
            <Text style={[s.resumeText, { color: accent }]}>Resume →</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={s.body}>{brief.body}</Text>
      <View style={[s.nextBlock, { borderTopColor: accent + '20' }]}>
        <Text style={[s.nextLabel, { color: accent + 'aa' }]}>Next move</Text>
        <Text style={s.nextText}>{brief.next}</Text>
      </View>
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  kickerPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    marginBottom: 6,
  },
  kicker: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: '#f8fafc', fontSize: 17, fontWeight: '900' },
  resumeBtn: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  resumeText: { fontSize: 12, fontWeight: '800' },
  body: { color: '#cbd5e1', fontSize: 13, lineHeight: 19 },
  nextBlock: {
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    padding: 12,
    borderTopWidth: 0,
  },
  nextLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  nextText: { color: '#f8fafc', fontSize: 13, lineHeight: 18, fontWeight: '700' },
});
