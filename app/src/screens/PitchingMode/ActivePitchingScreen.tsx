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
import { SessionTelemetry } from '../../components/SessionTelemetry';
import { LiveSessionStatus } from '../../components/LiveSessionStatus';
import { ConversationPrepBrief } from '../../components/ConversationPrepBrief';

function formatTime(s: number): string {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

interface Props {
  onEnd: () => void;
}

export function ActivePitchingScreen({ onEnd }: Props) {
  const { start, stop } = useWingmanSession();
  const {
    isConnected, isReconnecting, isRecording, isWingmanSpeaking, error,
    transcript, currentCoaching,
    elapsedSeconds, wordsSelf, pitchingSetup, setCurrentCoaching, setError,
    coachingHistory, getSessionConfig,
  } = useSessionStore();

  const ringAnim = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.6)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const [showCoaching, setShowCoaching] = useState(false);

  useEffect(() => {
    void start(getSessionConfig('pitching')).catch(() => {});
    return () => { void stop(); };
  }, [start, stop, getSessionConfig]);

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
    Alert.alert('End Pitch?', 'This will stop coaching and show your performance recap.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End', style: 'destructive', onPress: async () => { await stop(); onEnd(); } },
    ]);
  };

  const handleRetry = async () => {
    await stop();
    await start(getSessionConfig('pitching'));
  };
  const handleReconnect = handleRetry;
  const handleRestartMic = handleRetry;

  const pitchLabel = pitchingSetup.title || 'Active Pitch';

  const minutes = Math.max(elapsedSeconds / 60, 1 / 60);
  const wpm = Math.round(wordsSelf / minutes);
  const paceColor = wpm > 160 ? '#f43f5e' : wpm > 130 ? '#f59e0b' : '#4ade80';
  const paceWord = wpm > 160 ? 'Fast' : wpm < 90 ? 'Slow' : 'Good';
  const slideNum = Math.floor(elapsedSeconds / 90) + 1;

  const statusColor = isConnected ? '#4ade80' : isReconnecting ? '#f59e0b' : '#f43f5e';
  const statusLabel = isConnected
    ? (isRecording ? 'Listening' : 'Connected')
    : isReconnecting ? 'Reconnecting…' : 'Disconnected';

  return (
    <View style={s.root}>
      <LinearGradient colors={['#18120a', '#050510']} style={StyleSheet.absoluteFill} />
      <View style={s.ambientOrb} pointerEvents="none" />

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

        <LiveSessionStatus />
        <SessionTelemetry
          onRetry={handleRetry}
          onReconnect={handleReconnect}
          onRestartMic={handleRestartMic}
        />
        <ConversationPrepBrief
          compact
          label="BATTLE CARDS"
          mode="pitching"
          title={pitchLabel}
          audience={pitchingSetup.audience}
          context={pitchingSetup.deck}
        />
        {/* Prominent timer */}
        <Animated.View style={[s.timerHero, { opacity: headerAnim }]}>
          <Text style={s.timerHeroValue}>{formatTime(elapsedSeconds)}</Text>
          <Text style={s.timerHeroLabel}>ELAPSED</Text>
        </Animated.View>

        <Animated.View style={[s.prospectBar, { opacity: headerAnim }]}>
          <View style={s.prospectAvatar}>
            <Text style={s.prospectInitial}>🚀</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.prospectName} numberOfLines={1}>{pitchLabel}</Text>
            {pitchingSetup.audience ? (
              <Text style={s.prospectGoal} numberOfLines={1}>Audience: {pitchingSetup.audience}</Text>
            ) : null}
          </View>
        </Animated.View>

        <LiveStats
          chips={[
            { icon: '📊', value: `~${slideNum}`, label: 'SLIDE ~' },
            { icon: '⚡', value: paceWord, label: 'PACE', color: paceColor },
            { icon: '💡', value: coachingHistory.length.toString(), label: 'TIPS' },
          ]}
        />

        <View style={s.transcriptArea}>
          <View style={s.transcriptHeader}>
            <Text style={s.sectionLabel}>TRANSCRIPT</Text>
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
            <AudioWaveform isActive={isRecording} color="#f59e0b" height={36} barCount={20} />
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
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(245,158,11,0.04)',
    zIndex: 50,
  },
  ambientOrb: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    top: -60, left: -60, backgroundColor: 'rgba(245,158,11,0.06)',
  },

  statusBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
    justifyContent: 'space-between',
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },
  coachingCount: { alignItems: 'center' },
  coachingCountVal: { color: '#f59e0b', fontSize: 16, fontWeight: '800' },
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

  timerHero: { alignItems: 'center', paddingVertical: 14 },
  timerHeroValue: {
    color: '#f59e0b', fontSize: 52, fontWeight: '800',
    letterSpacing: 2, fontVariant: ['tabular-nums'],
  },
  timerHeroLabel: {
    color: '#475569', fontSize: 11, fontWeight: '700', letterSpacing: 3, marginTop: -2,
  },

  prospectBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12, gap: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  prospectAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(245,158,11,0.2)',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  prospectInitial: { fontSize: 20 },
  prospectName: { color: '#f1f5f9', fontSize: 15, fontWeight: '700' },
  prospectGoal: { color: '#475569', fontSize: 11, marginTop: 2, lineHeight: 16 },

  transcriptArea: { flex: 1 },
  transcriptHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, marginBottom: 6, marginTop: 6,
  },
  sectionLabel: { color: '#1e293b', fontSize: 9, fontWeight: '700', letterSpacing: 2 },

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
    borderRadius: 35, borderWidth: 2, borderColor: '#f59e0b',
  },
  micBtn: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  micBtnActive: {
    backgroundColor: 'rgba(245,158,11,0.22)',
    borderColor: 'rgba(245,158,11,0.6)',
  },
  micIcon: { fontSize: 24 },
  endBtn: {
    backgroundColor: 'rgba(244,63,94,0.12)',
    borderWidth: 1, borderColor: 'rgba(244,63,94,0.3)',
    borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12,
  },
  endBtnText: { color: '#f43f5e', fontSize: 14, fontWeight: '700' },
});
