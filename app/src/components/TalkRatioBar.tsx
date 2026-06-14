import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  wordsSelf: number;
  elapsedSeconds: number;
}

const WPS = 130 / 60;

export function TalkRatioBar({ wordsSelf, elapsedSeconds }: Props) {
  const talkSec = wordsSelf / WPS;
  const ratio = elapsedSeconds > 2
    ? Math.min(100, Math.round((talkSec / elapsedSeconds) * 100))
    : 0;
  const color = ratio > 70 ? '#ec4899' : ratio > 50 ? '#f59e0b' : '#4ade80';

  return (
    <View style={s.wrap}>
      <View style={s.track}>
        <View style={[s.fill, { width: `${ratio}%` as `${number}%`, backgroundColor: color }]} />
      </View>
      <View style={s.labels}>
        <Text style={[s.you, { color }]}>YOU {ratio}%</Text>
        <Text style={s.listen}>LISTEN {100 - ratio}%</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginHorizontal: 20, marginBottom: 10 },
  track: {
    height: 4, backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 2, overflow: 'hidden', marginBottom: 5,
  },
  fill: { height: '100%', borderRadius: 2 },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  you: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  listen: { color: '#334155', fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
});
