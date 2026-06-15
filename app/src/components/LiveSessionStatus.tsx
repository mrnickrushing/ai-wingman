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
      {/* Connection indicator */}
      <View style={[s.connDot, isConnected ? s.connOnline : s.connOffline]} />
      <Text style={[s.connLabel, isConnected ? s.connLabelOnline : s.connLabelOffline]}>
        {isConnected ? 'Connected' : 'Offline'}
      </Text>

      {/* State pills */}
      <View style={s.pillRow}>
        {states.map((item) => (
          <View key={item.label} style={[s.pill, item.active && s.pillActive]}>
            {item.active && <View style={s.pillDot} />}
            <Text style={[s.pillText, item.active && s.pillTextActive]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  connDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    left: 0,
    top: 6,
  },
  connOnline: { backgroundColor: '#4ade80' },
  connOffline: { backgroundColor: '#64748b' },
  connLabel: {
    paddingLeft: 16,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  connLabelOnline: { color: '#4ade80' },
  connLabelOffline: { color: '#64748b' },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  pillActive: {
    backgroundColor: 'rgba(74,222,128,0.11)',
    borderColor: 'rgba(74,222,128,0.3)',
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  pillDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#4ade80',
  },
  pillText: { color: '#64748b', fontSize: 11, fontWeight: '700' },
  pillTextActive: { color: '#4ade80' },
});
