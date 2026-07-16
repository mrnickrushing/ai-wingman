import { useShallow } from 'zustand/react/shallow';
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
    case 'connecting':      return 'Connecting';
    case 'ready':           return 'Ready';
    case 'recording':       return 'Recording';
    case 'streaming':       return 'Streaming';
    case 'coaching':        return 'Coaching';
    case 'error':           return 'Error';
    case 'idle':
    default:                return 'Idle';
  }
}

function serverLabel(status: string): { label: string; color: string } {
  switch (status) {
    case 'online':   return { label: 'Online',   color: '#4ade80' };
    case 'checking': return { label: 'Checking', color: '#f59e0b' };
    case 'offline':  return { label: 'Offline',  color: '#f43f5e' };
    default:         return { label: 'Unknown',  color: '#3d3d5c' };
  }
}

function micLabel(granted: boolean | null, recording: boolean): { label: string; color: string } {
  if (granted === false) return { label: 'Blocked', color: '#f43f5e' };
  if (recording)         return { label: 'Ready',   color: '#4ade80' };
  if (granted === true)  return { label: 'Granted', color: '#22d3ee' };
  return                        { label: 'Unknown', color: '#3d3d5c' };
}

function freshnessLabel(timestamp: number | null): { label: string; color: string } {
  if (!timestamp) return { label: 'Waiting', color: '#3d3d5c' };
  const ageSeconds = (Date.now() - timestamp) / 1000;
  if (ageSeconds < 10) return { label: 'Live', color: '#4ade80' };
  if (ageSeconds < 60) return { label: 'Warm', color: '#f59e0b' };
  return                      { label: 'Stale', color: '#3d3d5c' };
}

function appStateLabel(state: string): { label: string; color: string } {
  switch (state) {
    case 'active':     return { label: 'Foreground', color: '#4ade80' };
    case 'background': return { label: 'Background', color: '#f59e0b' };
    case 'inactive':   return { label: 'Inactive',   color: '#fbbf24' };
    case 'extension':  return { label: 'Extension',  color: '#22d3ee' };
    default:           return { label: 'Unknown',    color: '#3d3d5c' };
  }
}

function backgroundStateLabel(state: string): { label: string; color: string } {
  switch (state) {
    case 'verified': return { label: 'Verified', color: '#4ade80' };
    case 'watching': return { label: 'Watching', color: '#f59e0b' };
    case 'paused':   return { label: 'Paused',   color: '#f43f5e' };
    default:         return { label: 'Idle',      color: '#3d3d5c' };
  }
}

type Props = {
  onRetry?: () => void;
  onReconnect?: () => void;
  onRestartMic?: () => void;
  compact?: boolean;
};

export function SessionTelemetry({ onRetry, onReconnect, onRestartMic, compact = false }: Props) {
  const { sessionPhase,
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
    appState,
    backgroundAudioState, } = useSessionStore(
  useShallow((state) => ({
    sessionPhase: state.sessionPhase,
    serverHealth: state.serverHealth,
    micPermissionGranted: state.micPermissionGranted,
    isRecording: state.isRecording,
    isConnected: state.isConnected,
    isReconnecting: state.isReconnecting,
    transcript: state.transcript,
    coachingHistory: state.coachingHistory,
    currentCoaching: state.currentCoaching,
    lastTranscriptAt: state.lastTranscriptAt,
    lastAudioChunkAt: state.lastAudioChunkAt,
    micLevelDb: state.micLevelDb,
    lastErrorAt: state.lastErrorAt,
    error: state.error,
    appState: state.appState,
    backgroundAudioState: state.backgroundAudioState,
  }))
);

  const server = serverLabel(serverHealth);
  const mic = micLabel(micPermissionGranted, isRecording);
  const transcriptState = freshnessLabel(lastTranscriptAt);
  const audioState = freshnessLabel(lastAudioChunkAt);
  const app = appStateLabel(appState);
  const background = backgroundStateLabel(backgroundAudioState);
  const phase = statusLabel(sessionPhase);
  const connectionLabel = isConnected ? 'Connected' : isReconnecting ? 'Reconnecting' : 'Offline';
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
    ? '#3d3d5c'
    : micLevelDb === null
      ? '#22d3ee'
      : micLevelDb > -35
        ? '#4ade80'
        : micLevelDb > -50
          ? '#f59e0b'
          : '#f43f5e';

  const chips = [
    { label: 'Server',     value: server.label,          color: server.color },
    { label: 'Mic',        value: mic.label,              color: mic.color },
    { label: 'App',        value: app.label,              color: app.color },
    { label: 'Background', value: background.label,       color: background.color },
    { label: 'Transcript', value: transcriptState.label,  color: transcriptState.color },
    { label: 'Audio',      value: audioState.label,       color: audioState.color },
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
            <View style={[s.chipDot, { backgroundColor: chip.color + '28', borderColor: chip.color + '55' }]}>
              <View style={[s.chipDotInner, { backgroundColor: chip.color, shadowColor: chip.color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4 }]} />
            </View>
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
          <View
            style={[
              s.levelFill,
              {
                width: `${micPercent}%`,
                backgroundColor: hearingColor,
                shadowColor: hearingColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: 6,
              },
            ]}
          />
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
      {backgroundAudioState !== 'idle' ? (
        <Text style={s.noteText}>
          {backgroundAudioState === 'verified'
            ? 'Background audio survived the last app switch or lock.'
            : backgroundAudioState === 'paused'
              ? 'Background audio did not produce a fresh chunk after the app switched.'
              : 'Background audio is being watched during this session.'}
        </Text>
      ) : null}

      {(onRetry || onReconnect || onRestartMic) ? (
        <View style={s.actionRow}>
          {onRetry ? (
            <Pressable onPress={onRetry} style={s.actionBtn}>
              <Text style={s.actionText}>Retry</Text>
            </Pressable>
          ) : null}
          {onReconnect ? (
            <Pressable onPress={onReconnect} style={s.actionBtn}>
              <Text style={s.actionText}>Reconnect</Text>
            </Pressable>
          ) : null}
          {onRestartMic ? (
            <Pressable onPress={onRestartMic} style={s.actionBtn}>
              <Text style={s.actionText}>Restart mic</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#0c0c1e',
    borderWidth: 1,
    borderColor: '#1a1a36',
    borderRadius: 14,
    padding: 16,
    gap: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  compactCard: { paddingVertical: 12 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  sectionLabel: {
    color: '#3d3d5c',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  statusText: {
    color: '#7c7caa',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  retryBtn: {
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.36)',
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  retryText: { color: '#a5b4fc', fontSize: 12, fontWeight: '800' },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    flex: 1,
    flexBasis: 88,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 11,
    paddingVertical: 11,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 5,
    minWidth: 0,
  },
  chipLabel: { color: '#3d3d5c', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  chipDot: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  chipDotInner: { width: 9, height: 9, borderRadius: 5, elevation: 4 },
  chipValue: { fontSize: 11, fontWeight: '900', letterSpacing: 0.2 },
  footerRow: { gap: 4 },
  footerText: { color: '#3d3d5c', fontSize: 11 },
  levelBlock: { gap: 8 },
  levelHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  levelLabel: { color: '#3d3d5c', fontSize: 11, fontWeight: '800' },
  levelValue: { fontSize: 11, fontWeight: '900' },
  levelTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'visible',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  levelFill: { height: '100%', borderRadius: 999, elevation: 4 },
  errorText: { color: '#fca5c5', fontSize: 12, lineHeight: 18 },
  noteText: { color: '#3d3d5c', fontSize: 11 },
  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: {
    flexGrow: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionText: { color: '#e2e8f0', fontSize: 11, fontWeight: '900' },
});
