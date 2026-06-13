import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';

interface Mode {
  id: string;
  label: string;
  subtitle: string;
  accent: string;
  available: boolean;
}

const MODES: Mode[] = [
  {
    id: 'sales',
    label: 'Sales & Cold Calls',
    subtitle: 'Never freeze on an objection again',
    accent: '#5C6BFF',
    available: true,
  },
  {
    id: 'dating',
    label: 'Dating Mode',
    subtitle: 'From first text to second date',
    accent: '#FF3D8F',
    available: false,
  },
  {
    id: 'networking',
    label: 'Networking',
    subtitle: 'Work any room like a pro',
    accent: '#00C9A7',
    available: false,
  },
  {
    id: 'pitching',
    label: 'Pitching & Presenting',
    subtitle: 'Never lose the room',
    accent: '#F5A623',
    available: false,
  },
  {
    id: 'hardconvos',
    label: 'Hard Conversations',
    subtitle: 'Negotiations, firings, breakups',
    accent: '#9B59B6',
    available: false,
  },
];

interface Props {
  onSelectMode: (modeId: string) => void;
}

export function HomeScreen({ onSelectMode }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.appName}>AI Wingman</Text>
        <Text style={styles.tagline}>The smartest person in every room.</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>CHOOSE YOUR MODE</Text>
        {MODES.map((mode) => (
          <TouchableOpacity
            key={mode.id}
            style={[
              styles.card,
              { borderLeftColor: mode.accent, borderLeftWidth: 3 },
              !mode.available && styles.cardDisabled,
            ]}
            onPress={() => mode.available && onSelectMode(mode.id)}
            activeOpacity={mode.available ? 0.7 : 1}
          >
            <View style={styles.cardRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.cardTitle, { color: mode.available ? '#F0F0FA' : '#44445A' }]}
                >
                  {mode.label}
                </Text>
                <Text style={styles.cardSub}>{mode.subtitle}</Text>
              </View>
              {!mode.available && (
                <View style={styles.comingSoonPill}>
                  <Text style={styles.comingSoonText}>SOON</Text>
                </View>
              )}
              {mode.available && (
                <View style={[styles.activePill, { backgroundColor: mode.accent + '22', borderColor: mode.accent + '66' }]}>
                  <Text style={[styles.activeText, { color: mode.accent }]}>LIVE</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0A0A14',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#5C6BFF22',
  },
  appName: {
    color: '#F0F0FA',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tagline: {
    color: '#5C6BFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  grid: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 10,
  },
  sectionLabel: {
    color: '#44445A',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 6,
    paddingLeft: 4,
  },
  card: {
    backgroundColor: '#12121F',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E1E30',
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  cardSub: {
    color: '#666680',
    fontSize: 12,
    lineHeight: 18,
  },
  comingSoonPill: {
    backgroundColor: '#1E1E30',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  comingSoonText: {
    color: '#44445A',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  activePill: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  activeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
