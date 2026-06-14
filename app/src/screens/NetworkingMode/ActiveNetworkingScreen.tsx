import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, Animated, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSessionStore } from '../../store/sessionStore';
import { useWingmanSession } from '../../hooks/useWingmanSession';
import { CoachingBubble } from '../../components/CoachingBubble';
import { TranscriptView } from '../../components/TranscriptView';
import { AudioWaveform } from '../../components/AudioWaveform';
import { LiveStats } from '../../components/LiveStats';

function formatTime(s: number): string {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

interface Props {
  onEnd: () => void;
}

export function ActiveNetworkingScreen({ onEnd }: Props) {
  const { start, stop } = useWingmanSession();
  const {
    isConnected, isReconnecting, isRecording, isWingmanSpeaking, error,
    transcript, currentCoaching,
    elapsedSeconds, networkingSetup, setCurrentCoaching, setError,
    coachingHistory, loggedContacts, addLoggedContact, getSessionConfig,
  } = useSessionStore();

  const ringAnim = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0.6)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const [showCoaching, setShowCoaching] = useState(false);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [contactName, setContactName] = useState('');

  useEffect(() => {
    void start(getSessionConfig('networking')).catch(() => {});
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
    Alert.alert('End Session?', 'This will stop coaching and show your follow-ups.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End', style: 'destructive', onPress: async () => { await stop(); onEnd(); } },
    ]);
  };

  const confirmLogContact = () => {
    const name = contactName.trim();
    if (name) addLoggedContact(name);
    setContactName('');
    setLogModalOpen(false);
  };

  const eventLabel = networkingSetup.eventName || 'Active Event';

  const statusColor = isConnected ? '#4ade80' : isReconnecting ? '#f59e0b' : '#f43f5e';
  const statusLabel = isConnected
    ? (isRecording ? 'Listening' : 'Connected')
    : isReconnecting ? 'Reconnecting…' : 'Disconnected';

  return (
    <View style={s.root}>
      <LinearGradient colors={['#06181c', '#050510']} style={StyleSheet.absoluteFill} />
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
            <Text style={s.prospectInitial}>🤝</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.prospectName} numberOfLines={1}>{eventLabel}</Text>
            <Text style={s.prospectGoal} numberOfLines={1}>
              {loggedContacts.length} contact{loggedContacts.length === 1 ? '' : 's'} logged
            </Text>
          </View>
        </Animated.View>

        <LiveStats
          chips={[
            { icon: '👥', value: loggedContacts.length.toString(), label: 'CONTACTS' },
            { icon: '💡', value: coachingHistory.length.toString(), label: 'TIPS' },
            { icon: '⏱', value: formatTime(elapsedSeconds), label: 'ELAPSED' },
          ]}
        />

        <View style={s.transcriptArea}>
          <View style={s.transcriptHeader}>
            <Text style={s.sectionLabel}>TRANSCRIPT</Text>
            {loggedContacts.length > 0 && (
              <Text style={s.wordCount}>{loggedContacts.length} logged</Text>
            )}
          </View>
          <TranscriptView entries={transcript} />
        </View>

        {/* Log Contact floating button */}
        <TouchableOpacity
          style={s.logFab}
          onPress={() => setLogModalOpen(true)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#22d3ee', '#0891b2']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.logFabGrad}
          >
            <Text style={s.logFabText}>+ Log Contact</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={s.bottomBar}>
          <LinearGradient
            colors={['rgba(5,5,16,0)', 'rgba(5,5,16,0.95)', '#050510']}
            style={s.bottomFade}
            pointerEvents="none"
          />
          <View style={s.waveContainer}>
            <AudioWaveform isActive={isRecording} color="#22d3ee" height={36} barCount={20} />
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

      {/* Log Contact modal */}
      <Modal visible={logModalOpen} transparent animationType="fade" onRequestClose={() => setLogModalOpen(false)}>
        <KeyboardAvoidingView
          style={s.modalRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Log a contact</Text>
            <Text style={s.modalSub}>Who did you just meet?</Text>
            <TextInput
              style={s.modalInput}
              placeholder="Sarah Kim"
              placeholderTextColor="#334155"
              value={contactName}
              onChangeText={setContactName}
              autoFocus
              autoCapitalize="words"
              onSubmitEditing={confirmLogContact}
              returnKeyType="done"
            />
            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.modalCancel}
                onPress={() => { setContactName(''); setLogModalOpen(false); }}
              >
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.modalSave} onPress={confirmLogContact}>
                <LinearGradient
                  colors={['#22d3ee', '#0891b2']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.modalSaveGrad}
                >
                  <Text style={s.modalSaveText}>Log</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050510' },
  safe: { flex: 1 },
  glowOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(34,211,238,0.04)',
    zIndex: 50,
  },
  ambientOrb: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    bottom: 80, right: -60, backgroundColor: 'rgba(34,211,238,0.05)',
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
  coachingCountVal: { color: '#22d3ee', fontSize: 16, fontWeight: '800' },
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
    backgroundColor: 'rgba(34,211,238,0.2)',
    borderWidth: 1, borderColor: 'rgba(34,211,238,0.35)',
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
  wordCount: { color: '#334155', fontSize: 10, fontWeight: '600' },

  logFab: {
    position: 'absolute', right: 18, bottom: 150,
    borderRadius: 24, overflow: 'hidden', zIndex: 80,
    shadowColor: '#22d3ee', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 10,
  },
  logFabGrad: { paddingHorizontal: 18, paddingVertical: 12 },
  logFabText: { color: '#04222a', fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },

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
    borderRadius: 35, borderWidth: 2, borderColor: '#22d3ee',
  },
  micBtn: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(34,211,238,0.12)',
    borderWidth: 1, borderColor: 'rgba(34,211,238,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  micBtnActive: {
    backgroundColor: 'rgba(34,211,238,0.22)',
    borderColor: 'rgba(34,211,238,0.6)',
  },
  micIcon: { fontSize: 24 },
  endBtn: {
    backgroundColor: 'rgba(244,63,94,0.12)',
    borderWidth: 1, borderColor: 'rgba(244,63,94,0.3)',
    borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12,
  },
  endBtnText: { color: '#f43f5e', fontSize: 14, fontWeight: '700' },

  modalRoot: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28,
  },
  modalCard: {
    width: '100%', backgroundColor: '#0d0d1f',
    borderWidth: 1, borderColor: 'rgba(34,211,238,0.25)',
    borderRadius: 18, padding: 20, gap: 12,
  },
  modalTitle: { color: '#f1f5f9', fontSize: 18, fontWeight: '800' },
  modalSub: { color: '#64748b', fontSize: 13 },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(34,211,238,0.3)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    color: '#f1f5f9', fontSize: 16, marginTop: 4,
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalCancel: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  modalCancelText: { color: '#94a3b8', fontSize: 15, fontWeight: '700' },
  modalSave: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  modalSaveGrad: { paddingVertical: 14, alignItems: 'center' },
  modalSaveText: { color: '#04222a', fontSize: 15, fontWeight: '800' },
});
