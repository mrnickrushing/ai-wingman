import React, { useEffect, useState } from 'react';
import { Modal, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function RecordingConsentDialog({ visible, onCancel, onConfirm }: Props) {
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!visible) setConfirmed(false);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <SafeAreaView style={s.backdrop}>
        <View style={s.card} accessibilityViewIsModal>
          <View style={s.iconWrap}><Text style={s.icon}>🎙️</Text></View>
          <Text style={s.eyebrow}>BEFORE EVERY LIVE SESSION</Text>
          <Text style={s.title}>Confirm everyone agreed</Text>
          <Text style={s.body}>
            Do not start until every participant knows AI Wingman will listen, transmit, transcribe, and analyze this conversation.
          </Text>

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: confirmed }}
            accessibilityLabel="I informed every participant and obtained their consent"
            onPress={() => setConfirmed((value) => !value)}
            style={[s.confirmRow, confirmed && s.confirmRowActive]}
          >
            <View style={[s.checkbox, confirmed && s.checkboxActive]}>
              {confirmed ? <Text style={s.checkmark}>✓</Text> : null}
            </View>
            <Text style={s.confirmText}>
              I informed every participant and obtained their affirmative consent.
            </Text>
          </Pressable>

          <Text style={s.note}>
            Recording and interception laws vary by location. If anyone has not agreed, cancel this session.
          </Text>

          <View style={s.actions}>
            <Pressable accessibilityRole="button" onPress={onCancel} style={s.cancelButton}>
              <Text style={s.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !confirmed }}
              disabled={!confirmed}
              onPress={onConfirm}
              style={[s.startButton, !confirmed && s.startButtonDisabled]}
            >
              <LinearGradient
                colors={confirmed ? ['#6366f1', '#8b5cf6'] : ['#252536', '#252536']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.startGradient}
              >
                <Text style={[s.startText, !confirmed && s.startTextDisabled]}>Start session</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 22,
    backgroundColor: 'rgba(2,2,10,0.88)',
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.3)',
    backgroundColor: '#101020',
    padding: 22,
    shadowColor: '#6366f1',
    shadowOpacity: 0.28,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 18,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(99,102,241,0.14)',
    marginBottom: 14,
  },
  icon: { fontSize: 25 },
  eyebrow: { color: '#fbbf24', fontSize: 10, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
  title: { color: '#f8fafc', fontSize: 24, fontWeight: '900', textAlign: 'center', marginTop: 8 },
  body: { color: '#94a3b8', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10 },
  confirmRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.035)',
    padding: 14,
    marginTop: 20,
  },
  confirmRowActive: { borderColor: 'rgba(129,140,248,0.65)', backgroundColor: 'rgba(99,102,241,0.12)' },
  checkbox: { width: 26, height: 26, borderRadius: 7, borderWidth: 1.5, borderColor: '#64748b', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: '#6366f1', borderColor: '#818cf8' },
  checkmark: { color: '#fff', fontSize: 16, fontWeight: '900' },
  confirmText: { flex: 1, color: '#e2e8f0', fontSize: 14, lineHeight: 20, fontWeight: '700' },
  note: { color: '#64748b', fontSize: 11.5, lineHeight: 17, textAlign: 'center', marginTop: 13 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelButton: { minHeight: 50, flex: 0.72, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cancelText: { color: '#cbd5e1', fontSize: 14, fontWeight: '800' },
  startButton: { flex: 1.28, borderRadius: 14, overflow: 'hidden' },
  startButtonDisabled: { opacity: 0.72 },
  startGradient: { minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  startText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  startTextDisabled: { color: '#64748b' },
});
