import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Animated, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSessionStore } from '../../store/sessionStore';
import { useWingmanSession } from '../../hooks/useWingmanSession';
import { CoachingBubble } from '../../components/CoachingBubble';
import { TranscriptView } from '../../components/TranscriptView';
import { AudioWaveform } from '../../components/AudioWaveform';
import { LiveStats } from '../../components/LiveStats';

const POSITIVE_VIBE = ['good', 'great', 'energy', 'escalate'];
const NEGATIVE_VIBE = ['slow', 'awkward', 'silence'];

function formatTime(s: number): string {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

interface Props {
  onEnd: () => void;
}

export function ActiveDatingScreen({ onEnd }: Props) {
  const { start, stop } = useWingmanSession();
  const {
    isConnected, isReconnecting, isRecording, isWingmanSpeaking, error,
    transcript, currentCoaching,
    elapsedSeconds, wordsSelf, datingSetup, setCurrentCoaching, setError,
    coachingHistory, getSessionConfig,
  } = useSessionStore();

  const ringAnim = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.6)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const [showCoaching, setShowCoaching] = useState(false);
  const [silenceCount, setSilenceCount] = useState(0);
  const stoppedAtRef = useRef<number | null>(null);
  const prevRecordingRef = useRef(isRecording);

  useEffect(() => { start(getSessionConfig('dating')); return () => { stop(); }; }, []);

  // Count silence gaps: each time recording resumes after a >3s pause.
  useEffect(() => {
    const prev = prevRecordingRef.current;
    if (prev && !isRecording) {
      stoppedAtRef.current = Date.now();
    } else if (!prev && isRecording && stoppedAtRef.current != null) {
      if (Date.now() - stoppedAtRef.current > 3000) {
        setSilenceCount((c) => c + 1);
      }
      stoppedAtRef.current = null;
    }
    prevRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(ringAnim, { toValue: 1.6, duration: 1200, useNativeDriver: true }),
            Animated.timing(ringOpacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(ringAnim, { toValue: 1, duration: 0, useNativeDriver: true }),
            Animated.timing(ringOpacity, { toValue: 0.5, duration: 0, useNativeDriver: true }),
          ]),
        ])
      ).start();
    } else {
      ringAnim.setValue(1);
      ringOpacity.setValue(0);
    }
  }, [isRecording]);

  useEffect(() => {
    if (currentCoaching) setShowCoaching(true);
  }, [currentCoaching]);

  const dismissCoaching = () => {
    setShowCoaching(false);
    setCurrentCoaching(null);
  };

  const handleEnd = () => {
    Alert.alert('End Date Session?', 'This will stop coaching and show your recap.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End', style: 'destructive', onPress: async () => { await stop(); onEnd(); } },
    ]);
  };

  // Over-talking alert: words-per-minute relative to a balanced 120 wpm target.
  const minutes = Math.max(elapsedSeconds / 60, 1 / 60);
  const wpm = Math.round(wordsSelf / minutes);
  const talkPct = Math.min(100, Math.round((wpm / 200) * 100));
  const talkColor = wpm > 150 ? '#f43f5e' : wpm > 120 ? '#f59e0b' : '#4ade80';
  const paceWord = wpm > 150 ? 'Fast' : wpm < 90 ? 'Slow' : 'Good';

  const coachLower = (currentCoaching ?? '').toLowerCase();
  const vibe = POSITIVE_VIBE.some((w) => coachLower.includes(w))
    ? '🔥 Hot'
    : NEGATIVE_VIBE.some((w) => coachLower.includes(w))
    ? '❄️ Cool'
    : '✨ Good';

  const dateLabel = datingSetup.name || 'Active Date';

  const statusColor = isConnected ? '#4ade80' : isReconnecting ? '#f59e0b' : '#f43f5e';
  const statusLabel = isConnected
    ? (isRecording ? 'Listening' : 'Connected')
    : isReconnecting ? 'Reconnecting…' : 'Disconnected';

  return (
    <View style={s.root}>
      <LinearGradient colors={['#150818', '#050510']} style={StyleSheet.absoluteFill} />
      <View style={s.ambientOrb1} pointerEvents="none" />
      <View style={s.ambientOrb2} pointerEvents="none" />

      {showCoaching && currentCoaching && (
        <View style={s.glowOverlay} pointerEvents="none" />
      )}

      {showCoaching && currentCoaching && (
        <CoachingBubble text={currentCoaching} speaking={isWingmanSpeaking} onDismiss={dismissCoaching} />
      )}

      <SafeAreaView style={s.safe}>
        <Animated.View style={[s.statusBar, { opacity: headerAnim }]}>
          <View style={s.statusLeft}>
            <View style={[s.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
          <View style={s.timerBox}>
            <Text style={s.timerText}>{formatTime(elapsedSeconds)}</Text>
          </View>
          <View style={s.coachingCount}>
            <Text style={s.coachingCountVal}>{coachingHistory.length}</Text>
            <Text style={s.coachingCountLbl}>tips</Text>
          </View>
        </Animated.View>

        {error && (
          <TouchableOpacity style={s.errorBanner} onPress={() => setError(null)} activeOpacity={0.8}>
            <Text style={s.errorText}>⚠️ {error}</Text>
            <Text style={s.errorDismiss}>Dismiss ✕</Text>
          </TouchableOpacity>
        )}

        <Animated.View style={[s.prospectBar, { opacity: headerAnim }]}>
          <View style={s.prospectAvatar}>
            <Text style={s.prospectInitial}>
              {datingSetup.name?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.prospectName} numberOfLines={1}>{dateLabel}</Text>
            {datingSetup.intent ? (
              <Text style={s.prospectGoal} numberOfLines={1}>Intent: {datingSetup.intent}</Text>
            ) : null}
          </View>
          <View style={s.talkRatioChip}>
            <Text style={[s.talkRatioPct, { color: talkColor }]}>{wpm}</Text>
            <Text style={s.talkRatioLbl}>wpm</Text>
          </View>
        </Animated.View>

        <View style={s.ratioTrack}>
          <Animated.View style={[s.ratioFill, { width: `${talkPct}%`, backgroundColor: talkColor }]} />
        </View>

        <LiveStats
          chips={[
            { icon: '🤐', value: silenceCount.toString(), label: 'SILENCES' },
            { icon: '⚡', value: paceWord, label: 'PACE', color: talkColor },
            { icon: '💞', value: vibe, label: 'VIBE' },
          ]}
        />

        <View style={s.transcriptArea}>
          <View style={s.transcriptHeader}>
            <Text style={s.sectionLabel}>TRANSCRIPT</Text>
            {transcript.length > 0 && (
              <Text style={s.wordCount}>{wordsSelf} words</Text>
            )}
          </View>
          <TranscriptView entries={transcript} />
        </View>

        <View style={s.bottomBar}>
          <LinearGradient
            colors={['rgba(5,5,16,0)', 'rgba(5,5,16,0.95)', '#050510']}
            style={s.bottomFade}
            pointerEvents="none"
          />
          <View style={s.waveContainer}>
            <AudioWaveform isActive={isRecording} color="#ec4899" height={36} barCount={20} />
          </View>
          <View style={s.controls}>
            <View style={s.micWrap}>
              <Animated.View style={[s.micRing, {
                transform: [{ scale: ringAnim }],
                opacity: ringOpacity,
              }]} />
              <View style={[s.micBtn, isRecording && s.micBtnActive]}>
                <Text style={s.micIcon}>🎙️</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleEnd} style={s.endBtn} activeOpacity={0.8}>
              <Text style={s.endBtnText}>End</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050510' },
  safe: { flex: 1 },
  glowOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(236,72,153,0.04)',
    zIndex: 50,
  },
  ambientOrb1: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    bottom: 100, right: -60, backgroundColor: 'rgba(236,72,153,0.06)',
  },
  ambientOrb2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    bottom: 60, left: -70, backgroundColor: 'rgba(244,63,94,0.05)',
  },

  statusBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
    justifyContent: 'space-between',
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },
  timerBox: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5,
  },
  timerText: {
    color: '#f1f5f9', fontSize: 15, fontWeight: '700',
    letterSpacing: 1, fontVariant: ['tabular-nums'],
  },
  coachingCount: { alignItems: 'center' },
  coachingCountVal: { color: '#ec4899', fontSize: 16, fontWeight: '800' },
  coachingCountLbl: { color: '#475569', fontSize: 9, fontWeight: '600', letterSpacing: 0.5 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginTop: 4, marginBottom: 4,
    backgroundColor: 'rgba(244,63,94,0.12)',
    borderWidth: 1, borderColor: 'rgba(244,63,94,0.3)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  errorText: { color: '#fca5c5', fontSize: 12, fontWeight: '600', flex: 1 },
  errorDismiss: { color: '#f43f5e', fontSize: 11, fontWeight: '700', marginLeft: 12 },

  prospectBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12, gap: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  prospectAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(236,72,153,0.2)',
    borderWidth: 1, borderColor: 'rgba(236,72,153,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  prospectInitial: { color: '#ec4899', fontSize: 18, fontWeight: '800' },
  prospectName: { color: '#f1f5f9', fontSize: 15, fontWeight: '700' },
  prospectGoal: { color: '#475569', fontSize: 11, marginTop: 2, lineHeight: 16 },
  talkRatioChip: { alignItems: 'center', flexShrink: 0 },
  talkRatioPct: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  talkRatioLbl: { color: '#475569', fontSize: 9, fontWeight: '600', letterSpacing: 0.5 },

  ratioTrack: {
    height: 3, marginHorizontal: 20, marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden',
  },
  ratioFill: { height: '100%', borderRadius: 2 },

  transcriptArea: { flex: 1 },
  transcriptHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, marginBottom: 6,
  },
  sectionLabel: { color: '#1e293b', fontSize: 9, fontWeight: '700', letterSpacing: 2 },
  wordCount: { color: '#334155', fontSize: 10, fontWeight: '600' },

  bottomBar: { paddingBottom: 8, position: 'relative' },
  bottomFade: { position: 'absolute', top: -40, left: 0, right: 0, height: 50 },
  waveContainer: {
    alignItems: 'center', paddingHorizontal: 20,
    paddingTop: 8, paddingBottom: 4,
  },
  controls: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 24,
    paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8,
  },
  micWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  micRing: {
    position: 'absolute', width: 70, height: 70,
    borderRadius: 35, borderWidth: 2, borderColor: '#ec4899',
  },
  micBtn: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(236,72,153,0.12)',
    borderWidth: 1, borderColor: 'rgba(236,72,153,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  micBtnActive: {
    backgroundColor: 'rgba(236,72,153,0.22)',
    borderColor: 'rgba(236,72,153,0.6)',
  },
  micIcon: { fontSize: 24 },
  endBtn: {
    backgroundColor: 'rgba(244,63,94,0.12)',
    borderWidth: 1, borderColor: 'rgba(244,63,94,0.3)',
    borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12,
  },
  endBtnText: { color: '#f43f5e', fontSize: 14, fontWeight: '700' },
});
