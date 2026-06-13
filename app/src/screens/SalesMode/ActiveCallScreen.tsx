import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  Alert,
} from 'react-native';
import { useSessionStore } from '../../store/sessionStore';
import { useWingmanSession } from '../../hooks/useWingmanSession';
import { CoachingBubble } from '../../components/CoachingBubble';
import { TranscriptView } from '../../components/TranscriptView';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

interface Props {
  onEnd: () => void;
}

export function ActiveCallScreen({ onEnd }: Props) {
  const { start, stop } = useWingmanSession();
  const {
    isConnected,
    isRecording,
    transcript,
    currentCoaching,
    elapsedSeconds,
    wordsSelf,
    salesSetup,
  } = useSessionStore();

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Start session on mount
  useEffect(() => {
    start();
    return () => {
      stop();
    };
  }, []);

  // Pulse animation when recording
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const handleEnd = () => {
    Alert.alert('End Call?', 'This will stop the session and disconnect.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Call',
        style: 'destructive',
        onPress: async () => {
          await stop();
          onEnd();
        },
      },
    ]);
  };

  // Talk ratio — just our word count vs expected 50/50
  const talkRatio = wordsSelf > 0 ? Math.min(100, Math.round((wordsSelf / Math.max(wordsSelf, 50)) * 100)) : 0;
  const talkRatioColor = talkRatio > 65 ? '#FF3D8F' : talkRatio > 50 ? '#F5A623' : '#00C9A7';

  return (
    <SafeAreaView style={styles.safe}>
      <CoachingBubble text={currentCoaching} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>SALES MODE</Text>
          <Text style={styles.headerProspect} numberOfLines={1}>
            {salesSetup.prospectName
              ? `${salesSetup.prospectName}${salesSetup.company ? ` · ${salesSetup.company}` : ''}`
              : 'Active call'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.statusDot, { backgroundColor: isConnected ? '#00C9A7' : '#FF3D8F' }]} />
          <Text style={styles.timer}>{formatTime(elapsedSeconds)}</Text>
        </View>
      </View>

      {/* Talk ratio bar */}
      <View style={styles.ratioRow}>
        <Text style={styles.ratioLabel}>Talk ratio</Text>
        <View style={styles.ratioBar}>
          <View
            style={[
              styles.ratioFill,
              { width: `${talkRatio}%` as any, backgroundColor: talkRatioColor },
            ]}
          />
        </View>
        <Text style={[styles.ratioValue, { color: talkRatioColor }]}>{talkRatio}%</Text>
      </View>

      {/* Transcript */}
      <View style={styles.transcriptArea}>
        <Text style={styles.sectionLabel}>TRANSCRIPT</Text>
        <TranscriptView entries={transcript} />
      </View>

      {/* Record button */}
      <View style={styles.footer}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <View style={[styles.recordIndicator, isRecording && styles.recordIndicatorActive]}>
            <View style={styles.recordDot} />
          </View>
        </Animated.View>
        <Text style={styles.recordLabel}>
          {isRecording ? 'Listening' : isConnected ? 'Connecting…' : 'Disconnected'}
        </Text>
        <TouchableOpacity style={styles.endBtn} onPress={handleEnd}>
          <Text style={styles.endBtnText}>End Call</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0A0A14',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#5C6BFF22',
    marginTop: 56, // space for coaching bubble
  },
  headerLabel: {
    color: '#5C6BFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  headerProspect: {
    color: '#F0F0FA',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
    maxWidth: 220,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timer: {
    color: '#888899',
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  ratioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E30',
  },
  ratioLabel: {
    color: '#666680',
    fontSize: 11,
    fontWeight: '600',
    width: 70,
  },
  ratioBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#1E1E30',
    borderRadius: 2,
    overflow: 'hidden',
  },
  ratioFill: {
    height: '100%',
    borderRadius: 2,
  },
  ratioValue: {
    fontSize: 11,
    fontWeight: '700',
    width: 36,
    textAlign: 'right',
  },
  transcriptArea: {
    flex: 1,
    paddingTop: 12,
  },
  sectionLabel: {
    color: '#44445A',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E1E30',
  },
  recordIndicator: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1E1E30',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2E2E44',
  },
  recordIndicatorActive: {
    backgroundColor: '#5C6BFF22',
    borderColor: '#5C6BFF66',
  },
  recordDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#5C6BFF',
  },
  recordLabel: {
    color: '#666680',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  endBtn: {
    marginTop: 4,
    paddingHorizontal: 28,
    paddingVertical: 10,
    backgroundColor: '#FF3D8F22',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF3D8F44',
  },
  endBtnText: {
    color: '#FF3D8F',
    fontSize: 14,
    fontWeight: '700',
  },
});
