import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSessionStore } from '../store/sessionStore';

function age(timestamp: number | null): number | null {
  return timestamp ? (Date.now() - timestamp) / 1000 : null;
}

export function LiveSessionStatus() {
  const {
    isRecording,
    isConnected,
    currentCoaching,
    lastTranscriptAt,
    micLevelDb,
  } = useSessionStore();

  const transcriptAge = age(lastTranscriptAt);
  const hearing = isRecording && micLevelDb !== null && micLevelDb > -50;
  const transcribing = transcriptAge !== null && transcriptAge < 12;
  const states = [
    { label: 'Hearing you', active: hearing },
    { label: 'Transcribing', active: transcribing },
    { label: 'Coaching', active: Boolean(currentCoaching) },
  ];

  return (
    <View style={s.wrap}>
      <View style={[s.connectionDot, isConnected ? s.connected : s.offline]} />
      {states.map((item) => (
        <View key={item.label} style={[s.pill, item.active && s.pillActive]}>
          <Text style={[s.pillText, item.active && s.pillTextActive]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  connectionDot: { width: 9, height: 9, borderRadius: 5 },
  connected: { backgroundColor: '#4ade80' },
  offline: { backgroundColor: '#64748b' },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  pillActive: {
    backgroundColor: 'rgba(74,222,128,0.11)',
    borderColor: 'rgba(74,222,128,0.25)',
  },
  pillText: { color: '#64748b', fontSize: 11, fontWeight: '900' },
  pillTextActive: { color: '#4ade80' },
});
