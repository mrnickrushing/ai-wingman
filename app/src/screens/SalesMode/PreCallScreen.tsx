import { useShallow } from 'zustand/react/shallow';
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, KeyboardAvoidingView, Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSessionStore } from '../../store/sessionStore';
import { SessionPrepChecklist } from '../../components/SessionPrepChecklist';
import { SessionPreflightCard } from '../../components/SessionPreflightCard';
import { ConversationPrepBrief } from '../../components/ConversationPrepBrief';

const DEFAULT_OBJECTIONS = [
  '"Too expensive" → Ask: "What ROI would make this a no-brainer?"',
  '"Not the right time" → Ask: "What needs to change for timing to work?"',
  '"Need to think about it" → Ask: "What specific questions can I answer right now?"',
  '"We have a solution" → Ask: "What\'s the one thing your current solution doesn\'t do well?"',
  '"Need to check with boss" → Ask: "If it were your decision, would you move forward?"',
];

const STEPS = ['Prospect', 'Your Goal', 'Objections'];

interface Props {
  onStart: () => void;
  onBack: () => void;
}

export function PreCallScreen({ onStart, onBack }: Props) {
  const { salesSetup, setSalesSetup } = useSessionStore(
  useShallow((state) => ({
    salesSetup: state.salesSetup,
    setSalesSetup: state.setSalesSetup,
  }))
);
  const [step, setStep] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateToStep = (next: number) => {
    const dir = next > step ? 1 : -1;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: dir * -30, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      slideAnim.setValue(dir * 30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    });
  };

  const handleStart = () => {
    if (!salesSetup.objectionLibrary) {
      setSalesSetup({ objectionLibrary: DEFAULT_OBJECTIONS.join('\n') });
    }
    onStart();
  };

  const canProceed = step === 0
    ? !!salesSetup.prospectName
    : step === 1
    ? !!salesSetup.callGoal
    : true;

  return (
    <View style={s.root}>
      <LinearGradient colors={['#0c0c22', '#050510']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={s.safe}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={s.page} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={s.header}>
              <TouchableOpacity onPress={onBack} style={s.backBtn}>
                <Text style={s.backText}>← Back</Text>
              </TouchableOpacity>
              <View>
                <Text style={s.title}>Sales Mode</Text>
                <Text style={s.subtitle}>Set up your coaching</Text>
              </View>
            </View>

            {/* Step indicator */}
            <View style={s.stepRow}>
              {STEPS.map((label, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => i < step && animateToStep(i)}
                  style={s.stepItem}
                  activeOpacity={0.7}
                >
                  <View style={[s.stepDot, i === step && s.stepDotActive, i < step && s.stepDotDone]}>
                    {i < step ? (
                      <Text style={s.stepCheck}>✓</Text>
                    ) : (
                      <Text style={[s.stepNum, i === step && s.stepNumActive]}>{i + 1}</Text>
                    )}
                  </View>
                  <Text style={[s.stepLabel, i === step && s.stepLabelActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
              <View style={s.stepLine} />
            </View>

            <SessionPrepChecklist
              title="Ready check"
              subtitle="Make sure the essentials are in before you start."
              items={[
                { label: 'Prospect', detail: salesSetup.prospectName || 'Add a name', ready: Boolean(salesSetup.prospectName) },
                { label: 'Goal', detail: salesSetup.callGoal || 'Add a call goal', ready: Boolean(salesSetup.callGoal) },
                { label: 'Objections', detail: salesSetup.objectionLibrary ? 'Custom or default' : 'Default library will load', ready: Boolean(salesSetup.objectionLibrary) },
              ]}
            />
            <SessionPreflightCard />
            <ConversationPrepBrief
              mode="sales"
              title={[salesSetup.prospectName, salesSetup.company].filter(Boolean).join(' at ')}
              goal={salesSetup.callGoal}
              context={salesSetup.objectionLibrary}
            />

            {/* Step content */}
            <Animated.View style={[s.stepContent, {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            }]}>
              <View style={s.scrollContent}>
                {step === 0 && <StepProspect />}
                {step === 1 && <StepGoal />}
                {step === 2 && <StepObjections />}
              </View>
            </Animated.View>

            {/* Footer nav */}
            <View style={s.footer}>
              {step < 2 ? (
                <TouchableOpacity
                  style={[s.nextBtn, !canProceed && s.nextBtnDisabled]}
                  onPress={() => canProceed && animateToStep(step + 1)}
                  activeOpacity={canProceed ? 0.8 : 1}
                >
                  <LinearGradient
                    colors={canProceed ? ['#6366f1', '#8b5cf6'] : ['#1e1e2e', '#1e1e2e']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={s.nextBtnGrad}
                  >
                    <Text style={[s.nextBtnText, !canProceed && s.nextBtnTextDim]}>
                      Continue →
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handleStart} style={s.startWrap} activeOpacity={0.82}>
                  <LinearGradient
                    colors={['#6366f1', '#8b5cf6', '#ec4899']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={s.startGrad}
                  >
                    <Text style={s.startText}>🎧 Start Call</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              <Text style={s.footerHint}>
                {step === 2 ? 'Put phone in pocket · Wear AirPods · Go.' : `Step ${step + 1} of ${STEPS.length}`}
              </Text>
            </View>
          </ScrollView>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function StepProspect() {
  const { salesSetup, setSalesSetup } = useSessionStore(
  useShallow((state) => ({
    salesSetup: state.salesSetup,
    setSalesSetup: state.setSalesSetup,
  }))
);
  return (
    <View style={s.stepBody}>
      <Text style={s.stepTitle}>Who are you calling?</Text>
      <Text style={s.stepDesc}>The more context you give, the sharper the coaching.</Text>
      <Field
        label="Name *"
        placeholder="Marcus Chen"
        value={salesSetup.prospectName}
        onChangeText={(v) => setSalesSetup({ prospectName: v })}
      />
      <Field
        label="Company"
        placeholder="Acme Corp"
        value={salesSetup.company}
        onChangeText={(v) => setSalesSetup({ company: v })}
      />
      <Field
        label="Their Role"
        placeholder="VP of Sales"
        value={salesSetup.role}
        onChangeText={(v) => setSalesSetup({ role: v })}
      />
      <Field
        label="LinkedIn URL"
        placeholder="https://linkedin.com/in/..."
        value={salesSetup.linkedInUrl}
        onChangeText={(v) => setSalesSetup({ linkedInUrl: v })}
        autoCapitalize="none"
        keyboardType="url"
      />
    </View>
  );
}

function StepGoal() {
  const { salesSetup, setSalesSetup } = useSessionStore(
  useShallow((state) => ({
    salesSetup: state.salesSetup,
    setSalesSetup: state.setSalesSetup,
  }))
);
  return (
    <View style={s.stepBody}>
      <Text style={s.stepTitle}>What's your outcome?</Text>
      <Text style={s.stepDesc}>Define a specific goal. Wingman will coach toward it.</Text>
      <Field
        label="Call Goal *"
        placeholder="Book a 30-min product demo with the CTO"
        value={salesSetup.callGoal}
        onChangeText={(v) => setSalesSetup({ callGoal: v })}
        multiline
        numberOfLines={3}
      />
      <View style={s.examplesBox}>
        <Text style={s.examplesTitle}>Examples</Text>
        {[
          'Close the deal — get verbal yes today',
          'Save a churning account — find the root issue',
          'Move to next stage — schedule an onsite',
        ].map((ex, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => setSalesSetup({ callGoal: ex })}
            style={s.exampleChip}
          >
            <Text style={s.exampleChipText}>{ex}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function StepObjections() {
  const { salesSetup, setSalesSetup } = useSessionStore(
  useShallow((state) => ({
    salesSetup: state.salesSetup,
    setSalesSetup: state.setSalesSetup,
  }))
);
  const [editing, setEditing] = useState(false);
  const current = salesSetup.objectionLibrary || DEFAULT_OBJECTIONS.join('\n');
  const count = current.split('\n').filter(l => l.trim()).length;

  return (
    <View style={s.stepBody}>
      <Text style={s.stepTitle}>Prep your rebuttals</Text>
      <Text style={s.stepDesc}>
        Wingman will use this library to suggest instant responses when objections come up.
      </Text>
      <View style={s.objCard}>
        <View style={s.objCardHeader}>
          <View>
            <Text style={s.objCount}>{count} objections loaded</Text>
            <Text style={s.objCountSub}>Default library · tap to customize</Text>
          </View>
          <TouchableOpacity onPress={() => setEditing(!editing)} style={s.editBtn}>
            <Text style={s.editBtnText}>{editing ? 'Done' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>
        {editing ? (
          <TextInput
            style={s.objInput}
            value={current}
            onChangeText={(v) => setSalesSetup({ objectionLibrary: v })}
            multiline
            textAlignVertical="top"
            placeholderTextColor="#334155"
            autoFocus
          />
        ) : (
          <View style={s.objPreview}>
            {DEFAULT_OBJECTIONS.slice(0, 3).map((obj, i) => (
              <Text key={i} style={s.objLine} numberOfLines={1}>• {obj.split(' → ')[0]?.replace(/"/g, '').trim()}</Text>
            ))}
            {count > 3 && <Text style={s.objMore}>+{count - 3} more...</Text>}
          </View>
        )}
      </View>
      <View style={s.readyBox}>
        <Text style={s.readyIcon}>🎧</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.readyTitle}>You're ready.</Text>
          <Text style={s.readySub}>Put your phone in your pocket and tap Start Call.</Text>
        </View>
      </View>
    </View>
  );
}

interface FieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  numberOfLines?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'url' | 'email-address';
}

function Field({ label, placeholder, value, onChangeText, multiline, numberOfLines, autoCapitalize, keyboardType }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.input, multiline && s.inputMulti, focused && s.inputFocused]}
        placeholder={placeholder}
        placeholderTextColor="#334155"
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        numberOfLines={numberOfLines}
        autoCapitalize={autoCapitalize ?? 'words'}
        keyboardType={keyboardType ?? 'default'}
        textAlignVertical={multiline ? 'top' : 'center'}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050510' },
  safe: { flex: 1 },
  page: { paddingBottom: 20 },
  header: { paddingHorizontal: 22, paddingTop: 16, paddingBottom: 12 },
  backBtn: { marginBottom: 10 },
  backText: { color: '#6366f1', fontSize: 14, fontWeight: '600' },
  title: { color: '#f1f5f9', fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { color: '#475569', fontSize: 13, marginTop: 2 },

  stepRow: {
    flexDirection: 'row', paddingHorizontal: 22, paddingBottom: 20,
    alignItems: 'center', position: 'relative',
  },
  stepLine: {
    position: 'absolute', left: 22 + 16, right: 22 + 16, top: 16,
    height: 1, backgroundColor: 'rgba(255,255,255,0.06)', zIndex: 0,
  },
  stepItem: { flex: 1, alignItems: 'center', gap: 6, zIndex: 1 },
  stepDot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#0d0d1f', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  stepDotDone: { backgroundColor: 'rgba(99,102,241,0.2)', borderColor: 'rgba(99,102,241,0.4)' },
  stepNum: { color: '#475569', fontSize: 13, fontWeight: '700' },
  stepNumActive: { color: '#fff' },
  stepCheck: { color: '#6366f1', fontSize: 14, fontWeight: '800' },
  stepLabel: { color: '#475569', fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
  stepLabelActive: { color: '#f1f5f9' },

  stepContent: { marginTop: 2 },
  scrollContent: { paddingHorizontal: 22, paddingBottom: 20 },
  stepBody: { gap: 14 },
  stepTitle: { color: '#f1f5f9', fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  stepDesc: { color: '#475569', fontSize: 13, lineHeight: 19 },

  field: { gap: 6 },
  fieldLabel: { color: '#64748b', fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    color: '#f1f5f9', fontSize: 15,
  },
  inputMulti: { minHeight: 90, paddingTop: 13 },
  inputFocused: { borderColor: 'rgba(99,102,241,0.5)', backgroundColor: 'rgba(99,102,241,0.04)' },

  examplesBox: { gap: 8 },
  examplesTitle: { color: '#334155', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  exampleChip: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
  },
  exampleChipText: { color: '#64748b', fontSize: 12, lineHeight: 18 },

  objCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14, padding: 16, gap: 12,
  },
  objCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  objCount: { color: '#f1f5f9', fontSize: 14, fontWeight: '700' },
  objCountSub: { color: '#475569', fontSize: 11, marginTop: 2 },
  editBtn: {
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)',
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6,
  },
  editBtnText: { color: '#6366f1', fontSize: 12, fontWeight: '700' },
  objInput: {
    color: '#94a3b8', fontSize: 12, lineHeight: 20,
    minHeight: 160, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  objPreview: { gap: 5 },
  objLine: { color: '#475569', fontSize: 12, lineHeight: 18 },
  objMore: { color: '#334155', fontSize: 11, fontStyle: 'italic' },

  readyBox: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(99,102,241,0.08)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)',
    borderRadius: 14, padding: 16,
  },
  readyIcon: { fontSize: 28 },
  readyTitle: { color: '#f1f5f9', fontSize: 15, fontWeight: '700' },
  readySub: { color: '#64748b', fontSize: 12, marginTop: 2, lineHeight: 17 },

  footer: { paddingHorizontal: 22, paddingBottom: 24, paddingTop: 12, gap: 10 },
  nextBtn: { borderRadius: 14, overflow: 'hidden' },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnGrad: { paddingVertical: 16, alignItems: 'center' },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  nextBtnTextDim: { color: '#475569' },
  startWrap: { borderRadius: 16, overflow: 'hidden' },
  startGrad: { paddingVertical: 18, alignItems: 'center' },
  startText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
  footerHint: { color: '#334155', fontSize: 12, textAlign: 'center' },
});
