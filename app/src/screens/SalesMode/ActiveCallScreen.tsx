import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Animated, Alert, ScrollView,
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
import { TalkRatioBar } from '../../components/TalkRatioBar';
import { ConversationPrepBrief } from '../../components/ConversationPrepBrief';

function formatTime(s: number): string {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

interface Props {
  onEnd: () => void;
}

// UPGRADE 13: Multi-ring pulsing mic button
function MicButton({ isRecording }: { isRecording: boolean }) {
  const ring1Anim = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;
  const ring2Anim = useRef(new Animated.Value(1)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isRecording) {
      // Ring 1 — fast pulse
      const ring1Loop = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(ring1Anim, { toValue: 1.7, duration: 1000, useNativeDriver: true }),
            Animated.timing(ring1Opacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(ring1Anim, { toValue: 1, duration: 0, useNativeDriver: true }),
            Animated.timing(ring1Opacity, { toValue: 0.55, duration: 0, useNativeDriver: true }),
          ]),
        ])
      );
      // Ring 2 — staggered slower pulse
      const ring2Loop = Animated.loop(
        Animated.sequence([
          Animated.delay(500),
          Animated.parallel([
            Animated.timing(ring2Anim, { toValue: 1.7, duration: 1000, useNativeDriver: true }),
            Animated.timing(ring2Opacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(ring2Anim, { toValue: 1, duration: 0, useNativeDriver: true }),
            Animated.timing(ring2Opacity, { toValue: 0.35, duration: 0, useNativeDriver: true }),
          ]),
        ])
      );
      // Glow border breathe
      const glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 900, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 900, useNativeDriver: false }),
        ])
      );

      ring1Loop.start();
      ring2Loop.start();
      glowLoop.start();

      return () => {
        ring1Loop.stop();
        ring2Loop.stop();
        glowLoop.stop();
        ring1Anim.setValue(1);
        ring1Opacity.setValue(0);
        ring2Anim.setValue(1);
        ring2Opacity.setValue(0);
        glowAnim.setValue(0);
      };
    } else {
      ring1Anim.setValue(1);
      ring1Opacity.setValue(0);
      ring2Anim.setValue(1);
      ring2Opacity.setValue(0);
      glowAnim.setValue(0);
    }
  }, [isRecording]);

  const activeColor = isRecording ? '#4ade80' : '#6366f1';
  const borderColor = glowAnim.interpolate({
    inputRange: [0.3, 1],
    outputRange: [
      isRecording ? 'rgba(74,222,128,0.3)' : 'rgba(99,102,241,0.25)',
      isRecording ? 'rgba(74,222,128,0.8)' : 'rgba(99,102,241,0.6)',
    ],
  });

  return (
    <View style={mic.wrap}>
      {/* Ring 1 */}
      <Animated.View
        style={[
          mic.ring,
          {
            borderColor: activeColor,
            transform: [{ scale: ring1Anim }],
            opacity: ring1Opacity,
          },
        ]}
      />
      {/* Ring 2 — staggered */}
      <Animated.View
        style={[
          mic.ring,
          mic.ring2,
          {
            borderColor: activeColor,
            transform: [{ scale: ring2Anim }],
            opacity: ring2Opacity,
          },
        ]}
      />
      {/* Button body with animated glow border */}
      <Animated.View
        style={[
          mic.btn,
          isRecording && mic.btnActive,
          { borderColor },
        ]}
      >
        <Text style={mic.icon}>
          {isRecording ? '🔴' : '🎙️'}
        </Text>
      </Animated.View>
    </View>
  );
}

export function ActiveCallScreen({ onEnd }: Props) {
  const { start, stop } = useWingmanSession();
  const {
    isConnected, isReconnecting, isRecording, isWingmanSpeaking, error,
    transcript, currentCoaching,
    elapsedSeconds, wordsSelf, salesSetup, setCurrentCoaching, setError,
    coachingHistory, getSessionConfig,
  } = useSessionStore();

  const headerAnim = useRef(new Animated.Value(0)).current;
  const [showCoaching, setShowCoaching] = useState(false);

  useEffect(() => {
    // BUG 1 VERIFIED: getSessionConfig('sales') is the correct mode for this screen
    void start(getSessionConfig('sales')).catch(() => {});
    return () => { void stop(); };
  }, [start, stop, getSessionConfig]);

  // Header entrance
  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  // Show coaching bubble when new coaching arrives
  useEffect(() => {
    if (currentCoaching) setShowCoaching(true);
  }, [currentCoaching]);

  const dismissCoaching = () => {
    setShowCoaching(false);
    setCurrentCoaching(null);
  };

  const handleEnd = () => {
    Alert.alert('End Session?', 'This will stop the call and show your summary.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End Call', style: 'destructive', onPress: async () => { await stop(); onEnd(); } },
    ]);
  };

  const handleRetry = async () => {
    await stop();
    // BUG 1: uses getSessionConfig('sales') — correct for this screen
    await start(getSessionConfig('sales'));
  };
  const handleReconnect = handleRetry;
  const handleRestartMic = handleRetry;

  // Speaking pace: words-per-minute relative to a 120 wpm target
  const minutes = Math.max(elapsedSeconds / 60, 1 / 60);
  const wpm = Math.round(wordsSelf / minutes);
  const talkColor = wpm > 150 ? '#ec4899' : wpm > 120 ? '#f59e0b' : '#4ade80';
  const paceWord = wpm > 150 ? 'Fast' : wpm < 90 ? 'Slow' : 'Good';

  // Talk ratio: estimated % of session time spent speaking
  const talkSec = wordsSelf / (130 / 60);
  const talkRatio = elapsedSeconds > 2
    ? Math.min(100, Math.round((talkSec / elapsedSeconds) * 100))
    : 0;
  const ratioColor = talkRatio > 70 ? '#ec4899' : talkRatio > 50 ? '#f59e0b' : '#4ade80';

  const prospectLabel = [salesSetup.prospectName, salesSetup.company].filter(Boolean).join(' · ') || 'Active Call';

  const statusColor = isConnected ? '#4ade80' : isReconnecting ? '#f59e0b' : '#ec4899';
  const statusLabel = isConnected
    ? (isRecording ? 'Listening' : 'Connected')
    : isReconnecting ? 'Reconnecting…' : 'Disconnected';

  return (
    <View style={s.root}>
      <LinearGradient colors={['#080818', '#050510']} style={StyleSheet.absoluteFill} />
      <View style={s.ambientOrb} pointerEvents="none" />

      {/* Ambient glow when coaching arrives */}
      {showCoaching && currentCoaching && (
        <View style={s.glowOverlay} pointerEvents="none" />
      )}

      {/* Coaching bubble — overlays header */}
      {showCoaching && currentCoaching && (
        <CoachingBubble text={currentCoaching} speaking={isWingmanSpeaking} onDismiss={dismissCoaching} />
      )}

      <SafeAreaView style={s.safe}>
        {/* Status bar */}
        <Animated.View style={[s.statusBar, { opacity: headerAnim }]}>
          <View style={s.statusLeft}>
            <View style={[s.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[s.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
          <View style={s.timerBox}>
            <Text style={s.timerText}>{formatTime(elapsedSeconds)}</Text>
          </View>
          <View style={s.coachingCount}>
            <Text style={s.coachingCountVal}>{coachingHistory.length}</Text>
            <Text style={s.coachingCountLbl}>tips</Text>
          </View>
        </Animated.View>

        {/* Error banner */}
        {error && (
          <TouchableOpacity style={s.errorBanner} onPress={() => setError(null)} activeOpacity={0.8}>
            <Text style={s.errorText}>⚠️ {error}</Text>
            <Text style={s.errorDismiss}>Dismiss ✕</Text>
          </TouchableOpacity>
        )}

        <ScrollView style={s.bodyScroll} contentContainerStyle={s.bodyContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <LiveSessionStatus />
          <SessionTelemetry
            onRetry={handleRetry}
            onReconnect={handleReconnect}
            onRestartMic={handleRestartMic}
          />
          <ConversationPrepBrief
            compact
            label="BATTLE CARDS"
            mode="sales"
            title={[salesSetup.prospectName, salesSetup.company].filter(Boolean).join(' at ')}
            goal={salesSetup.callGoal}
            context={salesSetup.objectionLibrary}
          />
          {/* Prospect header */}
          <Animated.View style={[s.prospectBar, { opacity: headerAnim }]}>
            <View style={s.prospectAvatar}>
              <Text style={s.prospectInitial}>
                {salesSetup.prospectName?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.prospectName} numberOfLines={1}>{prospectLabel}</Text>
              {salesSetup.callGoal ? (
                <Text style={s.prospectGoal} numberOfLines={1}>Goal: {salesSetup.callGoal}</Text>
              ) : null}
            </View>
            <View style={s.talkRatioChip}>
              <Text style={[s.talkRatioPct, { color: ratioColor }]}>{talkRatio}%</Text>
              <Text style={s.talkRatioLbl}>you talking</Text>
            </View>
          </Animated.View>

          <TalkRatioBar wordsSelf={wordsSelf} elapsedSeconds={elapsedSeconds} />

          {/* Live stats */}
          <LiveStats
            chips={[
              { icon: '💡', value: coachingHistory.length.toString(), label: 'TIPS USED' },
              { icon: '⚡', value: paceWord, label: 'PACE', color: talkColor },
              { icon: '🎯', value: (salesSetup.callGoal || '—').slice(0, 20), label: 'GOAL' },
            ]}
          />

          {/* Transcript */}
          <View style={s.transcriptArea}>
            <View style={s.transcriptHeader}>
              <Text style={s.sectionLabel}>TRANSCRIPT</Text>
              {transcript.length > 0 && (
                <Text style={s.wordCount}>{wordsSelf} words</Text>
              )}
            </View>
            <TranscriptView entries={transcript} />
          </View>
        </ScrollView>

        {/* Bottom controls */}
        <View style={s.bottomBar}>
          <LinearGradient
            colors={['rgba(5,5,16,0)', 'rgba(5,5,16,0.95)', '#050510']}
            style={s.bottomFade}
            pointerEvents="none"
          />
          <View style={s.waveContainer}>
            <AudioWaveform isActive={isRecording} color="#6366f1" height={36} barCount={20} />
          </View>
          <View style={s.controls}>
            {/* UPGRADE 13: upgraded mic button */}
            <MicButton isRecording={isRecording} />
            <TouchableOpacity onPress={handleEnd} style={s.endBtn} activeOpacity={0.8}>
              <Text style={s.endBtnText}>End Call</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

// UPGRADE 13: mic button styles
const mic = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 72,
  },
  ring: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2,
  },
  ring2: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  btn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(99,102,241,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(99,102,241,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActive: {
    backgroundColor: 'rgba(74,222,128,0.15)',
  },
  icon: { fontSize: 26 },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050510' },
  safe: { flex: 1 },
  glowOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(99,102,241,0.04)',
    zIndex: 50,
  },
  ambientOrb: {
    position: 'absolute', width: 240, height: 240, borderRadius: 120,
    top: -70, right: -70, backgroundColor: 'rgba(99,102,241,0.07)',
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
  coachingCountVal: { color: '#8b5cf6', fontSize: 16, fontWeight: '800' },
  coachingCountLbl: { color: '#475569', fontSize: 9, fontWeight: '600', letterSpacing: 0.5 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginTop: 4, marginBottom: 4,
    backgroundColor: 'rgba(236,72,153,0.12)',
    borderWidth: 1, borderColor: 'rgba(236,72,153,0.3)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  errorText: { color: '#fca5c5', fontSize: 12, fontWeight: '600', flex: 1 },
  errorDismiss: { color: '#ec4899', fontSize: 11, fontWeight: '700', marginLeft: 12 },

  prospectBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12, gap: 12,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  prospectAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(99,102,241,0.2)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  prospectInitial: { color: '#6366f1', fontSize: 18, fontWeight: '800' },
  prospectName: { color: '#f1f5f9', fontSize: 15, fontWeight: '700' },
  prospectGoal: { color: '#475569', fontSize: 11, marginTop: 2, lineHeight: 16 },
  talkRatioChip: { alignItems: 'center', flexShrink: 0 },
  talkRatioPct: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  talkRatioLbl: { color: '#475569', fontSize: 9, fontWeight: '600', letterSpacing: 0.5 },

  transcriptArea: { minHeight: 220 },
  bodyScroll: { flex: 1 },
  bodyContent: { paddingBottom: 18 },
  transcriptHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, marginBottom: 6,
  },
  sectionLabel: { color: '#1e293b', fontSize: 9, fontWeight: '700', letterSpacing: 2 },
  wordCount: { color: '#334155', fontSize: 10, fontWeight: '600' },

  bottomBar: {
    paddingBottom: 8, position: 'relative',
  },
  bottomFade: {
    position: 'absolute', top: -40, left: 0, right: 0, height: 50,
  },
  waveContainer: {
    alignItems: 'center', paddingHorizontal: 20,
    paddingTop: 8, paddingBottom: 4,
  },
  controls: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 24,
    paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8,
  },
  endBtn: {
    backgroundColor: 'rgba(236,72,153,0.12)',
    borderWidth: 1, borderColor: 'rgba(236,72,153,0.3)',
    borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12,
  },
  endBtnText: { color: '#ec4899', fontSize: 14, fontWeight: '700' },
});
