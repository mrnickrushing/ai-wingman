import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSessionStore } from '../../store/sessionStore';

const DEFAULT_OBJECTION_LIBRARY = `- "Too expensive" → Ask: "What ROI would make this a no-brainer?"
- "Not the right time" → Ask: "What needs to change for timing to work?"
- "Need to think about it" → Ask: "What specific questions can I answer right now?"
- "We have a solution" → Ask: "What's the one thing your current solution doesn't do well?"
- "Need to check with boss" → Ask: "If it were your decision alone, would you move forward?"`;

interface Props {
  onStart: () => void;
  onBack: () => void;
}

export function PreCallScreen({ onStart, onBack }: Props) {
  const { salesSetup, setSalesSetup } = useSessionStore();
  const [showObjLibrary, setShowObjLibrary] = useState(false);

  const handleStart = () => {
    if (!salesSetup.objectionLibrary) {
      setSalesSetup({ objectionLibrary: DEFAULT_OBJECTION_LIBRARY });
    }
    onStart();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Sales Mode</Text>
          <Text style={styles.subtitle}>Pre-call setup</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Section label="PROSPECT">
            <Field
              label="Name"
              placeholder="e.g. Marcus Chen"
              value={salesSetup.prospectName}
              onChangeText={(v) => setSalesSetup({ prospectName: v })}
            />
            <Field
              label="Company"
              placeholder="e.g. Acme Corp"
              value={salesSetup.company}
              onChangeText={(v) => setSalesSetup({ company: v })}
            />
            <Field
              label="Role"
              placeholder="e.g. VP of Sales"
              value={salesSetup.role}
              onChangeText={(v) => setSalesSetup({ role: v })}
            />
            <Field
              label="LinkedIn / URL"
              placeholder="https://linkedin.com/in/..."
              value={salesSetup.linkedInUrl}
              onChangeText={(v) => setSalesSetup({ linkedInUrl: v })}
              autoCapitalize="none"
            />
          </Section>

          <Section label="CALL GOAL">
            <Field
              label="What's the outcome you're going for?"
              placeholder="e.g. Book a demo, close the deal, save a churning account"
              value={salesSetup.callGoal}
              onChangeText={(v) => setSalesSetup({ callGoal: v })}
              multiline
              numberOfLines={2}
            />
          </Section>

          <Section label="OBJECTION LIBRARY">
            <TouchableOpacity
              onPress={() => setShowObjLibrary(!showObjLibrary)}
              style={styles.expandToggle}
            >
              <Text style={styles.expandLabel}>
                {showObjLibrary ? 'Hide' : 'Edit'} objection library
              </Text>
              <Text style={styles.expandIcon}>{showObjLibrary ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showObjLibrary && (
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={salesSetup.objectionLibrary || DEFAULT_OBJECTION_LIBRARY}
                onChangeText={(v) => setSalesSetup({ objectionLibrary: v })}
                multiline
                numberOfLines={8}
                placeholderTextColor="#44445A"
                textAlignVertical="top"
              />
            )}
            {!showObjLibrary && (
              <Text style={styles.objPreview}>
                {salesSetup.objectionLibrary
                  ? `${salesSetup.objectionLibrary.split('\n').length} objections loaded`
                  : '5 default objections loaded'}
              </Text>
            )}
          </Section>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
            <Text style={styles.startBtnText}>Start Call</Text>
          </TouchableOpacity>
          <Text style={styles.footerHint}>
            Put your phone in your pocket. Wear your AirPods.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
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
}

function Field({ label, placeholder, value, onChangeText, multiline, numberOfLines, autoCapitalize }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMulti]}
        placeholder={placeholder}
        placeholderTextColor="#44445A"
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        numberOfLines={numberOfLines}
        autoCapitalize={autoCapitalize ?? 'words'}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0A0A14',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#5C6BFF22',
  },
  backBtn: {
    marginBottom: 8,
  },
  backText: {
    color: '#5C6BFF',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    color: '#F0F0FA',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#666680',
    fontSize: 13,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    gap: 24,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    color: '#44445A',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    color: '#888899',
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#12121F',
    borderWidth: 1,
    borderColor: '#1E1E30',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F0F0FA',
    fontSize: 14,
  },
  inputMulti: {
    minHeight: 80,
    paddingTop: 12,
  },
  expandToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  expandLabel: {
    color: '#5C6BFF',
    fontSize: 13,
    fontWeight: '600',
  },
  expandIcon: {
    color: '#5C6BFF',
    fontSize: 10,
  },
  objPreview: {
    color: '#666680',
    fontSize: 12,
    fontStyle: 'italic',
  },
  footer: {
    padding: 20,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E1E30',
  },
  startBtn: {
    backgroundColor: '#5C6BFF',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footerHint: {
    color: '#44445A',
    fontSize: 12,
    textAlign: 'center',
  },
});
