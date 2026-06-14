import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ConversationMode, SessionRecap } from '../types';

type Props = {
  latestRecap?: SessionRecap | null;
  onResumeMode?: (mode: ConversationMode) => void;
};

function modeLabel(mode?: ConversationMode | null): string {
  switch (mode) {
    case 'dating': return 'Dating';
    case 'networking': return 'Networking';
    case 'pitching': return 'Pitching';
    case 'hard_conversations': return 'Hard Talk';
    case 'sales':
    default:
      return 'Sales';
  }
}

export function PrepPacketCard({ latestRecap, onResumeMode }: Props) {
  const packet = useMemo(() => {
    if (!latestRecap) {
      return {
        title: 'Build your first prep packet',
        body: 'Run a session and Wingman will remember what mattered, what broke, and what to tighten next time.',
        next: 'Start a mode to create memory.',
      };
    }

    const nextStep = latestRecap.followUps?.[0]?.text
      ?? latestRecap.improvements?.[0]
      ?? latestRecap.highlights[0]
      ?? latestRecap.summary;
    return {
      title: `${modeLabel(latestRecap.mode)} prep packet`,
      body: latestRecap.summary,
      next: nextStep,
    };
  }, [latestRecap]);

  return (
    <View style={s.card}>
      <View style={s.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={s.kicker}>PREP PACKET</Text>
          <Text style={s.title}>{packet.title}</Text>
        </View>
        {latestRecap && onResumeMode ? (
          <TouchableOpacity onPress={() => onResumeMode(latestRecap.mode)} style={s.resumeBtn} activeOpacity={0.8}>
            <Text style={s.resumeText}>Resume</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={s.body}>{packet.body}</Text>
      <View style={s.nextBlock}>
        <Text style={s.nextLabel}>Next move</Text>
        <Text style={s.nextText}>{packet.next}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(99,102,241,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.2)',
    borderRadius: 8,
    padding: 16,
    gap: 10,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kicker: { color: '#818cf8', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: '#f8fafc', fontSize: 17, fontWeight: '900', marginTop: 3 },
  resumeBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  resumeText: { color: '#e2e8f0', fontSize: 12, fontWeight: '800' },
  body: { color: '#cbd5e1', fontSize: 13, lineHeight: 19 },
  nextBlock: {
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    padding: 10,
  },
  nextLabel: { color: '#64748b', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  nextText: { color: '#f8fafc', fontSize: 13, lineHeight: 18, fontWeight: '700' },
});
