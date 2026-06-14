import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSessionStore } from '../store/sessionStore';

function agoLabel(timestamp: number | null): string {
  if (!timestamp) return '—';
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

function statusLabel(phase: string): string {
  switch (phase) {
    case 'checking_server': return 'Checking';
    case 'connecting': return 'Connecting';
    case 'ready': return 'Ready';
    case 'recording': return 'Recording';
    case 'streaming': return 'Streaming';
    case 'coaching': return 'Coaching';
    case 'error': return 'Error';
    case 'idle':
    default:
      return 'Idle';
  }
}

function serverLabel(status: string): { label: string; color: string } {
  switch (status) {
    case 'online': return { label: 'Online', color: '#4ade80' };
    case 'checking': return { label: 'Checking', color: '#f59e0b' };
    case 'offline': return { label: 'Offline', color: '#f43f5e' };
    case 'unknown':
    default:
      return { label: 'Unknown', color: '#64748b' };
  }
}

function micLabel(granted: boolean | null, recording: boolean): { label: string; color: string } {
  if (granted === false) return { label: 'Blocked', color: '#f43f5e' };
  if (recording) return { label: 'Ready', color: '#4ade80' };
  if (granted === true) return { label: 'Granted', color: '#22d3ee' };
  return { label: 'Unknown', color: '#64748b' };
}

function freshnessLabel(timestamp: number | null): { label: string; color: string } {
  if (!timestamp) return { label: 'Waiting', color: '#64748b' };
  const ageSeconds = (Date.now() - timestamp) / 1000;
  if (ageSeconds < 10) return { label: 'Live', color: '#4ade80' };
  if (ageSeconds < 60) return { label: 'Warm', color: '#f59e0b' };
  return { label: 'Stale', color: '#64748b' };
}

type Props = {
  onRetry?: () => void;
  compact?: boolean;
};

export function SessionTelemetry({ onRetry, compact = false }: Props) {
  const {
    sessionPhase,
    serverHealth,
    micPermissionGranted,
    isRecording,
    isConnected,
    isReconnecting,
    transcript,
    coachingHistory,
    currentCoaching,
    lastTranscriptAt,
    lastAudioChunkAt,
    micLevelDb,
    lastErrorAt,
    error,
  } = useSessionStore();

  const server = serverLabel(serverHealth);
  const mic = micLabel(micPermissionGranted, isRecording);
  const transcriptState = freshnessLabel(lastTranscriptAt);
  const audioState = freshnessLabel(lastAudioChunkAt);
  const phase = statusLabel(sessionPhase);
  const connectionLabel = isConnected
    ? 'Connected'
    : isReconnecting
      ? 'Reconnecting'
      : 'Offline';
  const micPercent = micLevelDb === null
    ? 0
    : Math.max(4, Math.min(100, Math.round(((micLevelDb + 70) / 40) * 100)));
  const hearingLabel = !isRecording
    ? 'Not listening'
    : micLevelDb === null
      ? 'Listening'
      : micLevelDb > -35
        ? 'Hearing you clearly'
        : micLevelDb > -50
          ? 'Hearing low speech'
          : 'Too quiet';
  const hearingColor = !isRecording
    ? '#64748b'
    : micLevelDb === null
      ? '#22d3ee'
      : micLevelDb > -35
        ? '#4ade80'
        : micLevelDb > -50
          ? '#f59e0b'
          : '#f43f5e';

  const chips = [
    { label: 'Server', value: server.label, color: server.color },
    { label: 'Mic', value: mic.label, color: mic.color },
    { label: 'Transcript', value: transcriptState.label, color: transcriptState.color },
    { label: 'Audio', value: audioState.label, color: audioState.color },
  ];

  return (
    <View style={[s.card, compact && s.compactCard]}>
      <View style={s.headerRow}>
        <View>
          <Text style={s.sectionLabel}>WINGMAN STATUS</Text>
          <Text style={s.statusText} numberOfLines={1}>
            {error ? error : `${phase} · ${connectionLabel}`}
          </Text>
        </View>
        {onRetry && error ? (
          <Pressable onPress={onRetry} style={s.retryBtn}>
            <Text style={s.retryText}>Retry</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={s.chipRow}>
        {chips.map((chip) => (
          <View key={chip.label} style={s.chip}>
            <Text style={s.chipLabel}>{chip.label}</Text>
            <Text style={[s.chipValue, { color: chip.color }]} numberOfLines={1}>{chip.value}</Text>
          </View>
        ))}
      </View>

      <View style={s.levelBlock}>
        <View style={s.levelHeader}>
          <Text style={s.levelLabel}>Mic level</Text>
          <Text style={[s.levelValue, { color: hearingColor }]}>{hearingLabel}</Text>
        </View>
        <View style={s.levelTrack}>
          <View style={[s.levelFill, { width: `${micPercent}%`, backgroundColor: hearingColor }]} />
        </View>
      </View>

      {!compact ? null : (
        <View style={s.footerRow}>
          <Text style={s.footerText} numberOfLines={1}>
            Last audio {agoLabel(lastAudioChunkAt)} · Last transcript {agoLabel(lastTranscriptAt)}
          </Text>
          <Text style={s.footerText} numberOfLines={1}>
            Lines {transcript.length} · Tips {coachingHistory.length} · Live tip {currentCoaching ? 'yes' : 'no'}
          </Text>
        </View>
      )}

      {!error && lastErrorAt && compact ? <Text style={s.noteText}>Last error {agoLabel(lastErrorAt)}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 12,
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  compactCard: {
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  sectionLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statusText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  retryBtn: {
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.32)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  retryText: { color: '#c4b5fd', fontSize: 12, fontWeight: '700' },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 2,
    minWidth: 0,
  },
  chipLabel: { color: '#64748b', fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },
  chipValue: { fontSize: 13, fontWeight: '800' },
  footerRow: { gap: 4 },
  footerText: { color: '#64748b', fontSize: 11 },
  levelBlock: { gap: 7 },
  levelHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  levelLabel: { color: '#64748b', fontSize: 11, fontWeight: '800' },
  levelValue: { fontSize: 11, fontWeight: '900' },
  levelTrack: {
    height: 7,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  levelFill: { height: '100%', borderRadius: 999 },
  errorText: { color: '#fca5c5', fontSize: 12, lineHeight: 18 },
  noteText: { color: '#64748b', fontSize: 11 },
});
