import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { runWingmanPreflight, type WingmanPreflightResult } from '../hooks/useWingmanSession';

type Step = {
  label: string;
  ok: boolean;
  message: string;
};

function formatPeak(peakDb: number | null): string {
  if (peakDb === null || !Number.isFinite(peakDb)) return '';
  return ` Peak ${Math.round(peakDb)} dB.`;
}

export function SessionPreflightCard() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<WingmanPreflightResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const steps = useMemo<Step[]>(() => {
    if (!result) return [];
    return [
      { label: 'Server', ok: result.server.ok, message: result.server.message },
      { label: 'Microphone', ok: result.microphone.ok, message: result.microphone.message },
      { label: 'Recorder', ok: result.recorder.ok, message: result.recorder.message },
      {
        label: 'Voice input',
        ok: result.input.ok,
        message: `${result.input.message}${formatPeak(result.input.peakDb)}`,
      },
    ];
  }, [result]);

  const handleRun = async () => {
    if (running) return;
    setRunning(true);
    setError(null);
    try {
      const next = await runWingmanPreflight();
      setResult(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ready check failed.');
    } finally {
      setRunning(false);
    }
  };

  const status = result?.ok
    ? 'Ready'
    : result
      ? 'Needs attention'
      : 'Not checked';

  return (
    <View style={s.card}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Live audio check</Text>
          <Text style={s.subtitle}>
            Tap once, say a short sentence, and confirm the server can receive usable mic audio.
          </Text>
          <Text style={s.note}>
            During a live run, the app tracks whether audio survives lock-screen and app-switch behavior instead of hiding it.
          </Text>
        </View>
        <View style={[s.badge, result?.ok ? s.badgeReady : s.badgePending]}>
          <Text style={[s.badgeText, result?.ok ? s.badgeTextReady : s.badgeTextPending]}>
            {status}
          </Text>
        </View>
      </View>

      <Pressable style={[s.button, running && s.buttonDisabled]} onPress={handleRun} disabled={running}>
        {running ? <ActivityIndicator color="#f8fafc" size="small" /> : null}
        <Text style={s.buttonText}>{running ? 'Listening...' : 'Run ready check'}</Text>
      </Pressable>

      <Text style={s.backgroundNote}>
        Background audio is enabled in this build. Lock the phone or switch apps during a live session to validate it on device.
      </Text>

      {steps.length > 0 && (
        <View style={s.list}>
          {steps.map((step) => (
            <View key={step.label} style={s.row}>
              <View style={[s.dot, step.ok ? s.dotReady : s.dotBad]} />
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>{step.label}</Text>
                <Text style={s.rowMessage}>{step.message}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(99,102,241,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.22)',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    marginTop: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { color: '#f8fafc', fontSize: 15, fontWeight: '800' },
  subtitle: { color: '#94a3b8', fontSize: 12, lineHeight: 17, marginTop: 4 },
  note: { color: '#64748b', fontSize: 11, lineHeight: 16, marginTop: 6 },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  badgeReady: { backgroundColor: 'rgba(74,222,128,0.12)', borderColor: 'rgba(74,222,128,0.3)' },
  badgePending: { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.28)' },
  badgeText: { fontSize: 11, fontWeight: '800' },
  badgeTextReady: { color: '#4ade80' },
  badgeTextPending: { color: '#f59e0b' },
  button: {
    minHeight: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#6366f1',
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#f8fafc', fontSize: 13, fontWeight: '800' },
  backgroundNote: { color: '#94a3b8', fontSize: 11, lineHeight: 16 },
  list: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotReady: { backgroundColor: '#4ade80' },
  dotBad: { backgroundColor: '#fb7185' },
  rowLabel: { color: '#f8fafc', fontSize: 12, fontWeight: '800' },
  rowMessage: { color: '#94a3b8', fontSize: 11, lineHeight: 15, marginTop: 2 },
  error: { color: '#fb7185', fontSize: 12, lineHeight: 17 },
});
