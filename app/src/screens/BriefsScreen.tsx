import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ConversationMode, SessionRecap } from '../types';
import { loadSessionRecaps } from '../utils/sessionArchive';
import { PrepBriefCard } from '../components/PrepBriefCard';

type Mode = {
  id: ConversationMode;
  label: string;
  accent: string;
  description: string;
};

const MODES: Mode[] = [
  { id: 'sales', label: 'Sales', accent: '#6366f1', description: 'Objections, closes, and follow-up.' },
  { id: 'dating', label: 'Dating', accent: '#ec4899', description: 'Momentum, presence, and next steps.' },
  { id: 'networking', label: 'Networking', accent: '#22d3ee', description: 'Rooms, intros, and useful follow-up.' },
  { id: 'pitching', label: 'Pitching', accent: '#f59e0b', description: 'Delivery, proof, and Q&A.' },
  { id: 'hard_conversations', label: 'Hard Talk', accent: '#8b5cf6', description: 'Boundaries, calm, and clarity.' },
];

type Props = {
  onBack: () => void;
  onStartMode: (modeId: string) => void;
};

export function BriefsScreen({ onBack, onStartMode }: Props) {
  const [recentRecaps, setRecentRecaps] = useState<SessionRecap[]>([]);

  useEffect(() => {
    loadSessionRecaps(8).then(setRecentRecaps);
  }, []);

  const latestRecap = recentRecaps[0] ?? null;

  const nextUp = useMemo(() => {
    if (!latestRecap) {
      return 'Run a session and this page will keep the last prep brief, recap, and next move together.';
    }
    return latestRecap.followUps?.[0]?.text
      ?? latestRecap.improvements?.[0]
      ?? latestRecap.highlights[0]
      ?? latestRecap.summary;
  }, [latestRecap]);

  return (
    <View style={s.root}>
      <LinearGradient colors={['#090914', '#050510']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={onBack} style={s.backBtn} activeOpacity={0.8}>
            <Text style={s.backText}>Back</Text>
          </TouchableOpacity>
          <View style={s.headerCopy}>
            <Text style={s.title}>Briefs</Text>
            <Text style={s.subtitle}>Prep, recap, and the next move without crowding the home screen.</Text>
          </View>
          <View style={s.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.hero}>
            <Text style={s.heroTitle}>Your prep brief lives here.</Text>
            <Text style={s.heroBody}>
              Keep the focused stuff out of the home dashboard: what to say, what broke, and what to tighten next.
            </Text>
          </View>

          <PrepBriefCard
            latestRecap={latestRecap}
            onResumeMode={latestRecap ? (mode) => onStartMode(mode) : undefined}
          />

          <View style={s.nextCard}>
            <Text style={s.nextLabel}>Next move</Text>
            <Text style={s.nextText}>{nextUp}</Text>
          </View>

          <Section title="Quick start" action="Jump back into a mode" />
          <View style={s.modeGrid}>
            {MODES.map((mode) => (
              <TouchableOpacity
                key={mode.id}
                onPress={() => onStartMode(mode.id)}
                style={s.modeCard}
                activeOpacity={0.82}
              >
                <View style={[s.modeChip, { borderColor: mode.accent, backgroundColor: `${mode.accent}20` }]}>
                  <Text style={[s.modeChipText, { color: mode.accent }]}>{mode.label.slice(0, 1)}</Text>
                </View>
                <Text style={s.modeTitle}>{mode.label}</Text>
                <Text style={s.modeBody}>{mode.description}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Section title="Recent recaps" action="Keep the last few in view" />
          {recentRecaps.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyTitle}>No briefs yet</Text>
              <Text style={s.emptyBody}>Run a live session or practice mode and the last recap will show up here.</Text>
            </View>
          ) : (
            <View style={s.recapList}>
              {recentRecaps.map((recap) => (
                <TouchableOpacity
                  key={recap.id}
                  onPress={() => onStartMode(recap.mode)}
                  style={s.recapCard}
                  activeOpacity={0.82}
                >
                  <View style={s.recapTop}>
                    <Text style={s.recapTitle}>{recap.title}</Text>
                    <Text style={s.recapScore}>{recap.score}</Text>
                  </View>
                  <Text style={s.recapSubtitle} numberOfLines={1}>{recap.subtitle}</Text>
                  <Text style={s.recapSummary} numberOfLines={3}>{recap.summary}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Section({ title, action }: { title: string; action: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      <Text style={s.sectionAction}>{action}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050510' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backText: { color: '#e2e8f0', fontSize: 12, fontWeight: '800' },
  headerCopy: { flex: 1 },
  title: { color: '#f8fafc', fontSize: 24, fontWeight: '900' },
  subtitle: { color: '#94a3b8', fontSize: 12, lineHeight: 17, marginTop: 2 },
  headerSpacer: { width: 68 },
  content: { paddingHorizontal: 18, paddingBottom: 36, gap: 16 },
  hero: {
    backgroundColor: 'rgba(99,102,241,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.20)',
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  heroTitle: { color: '#f8fafc', fontSize: 22, fontWeight: '900', lineHeight: 27 },
  heroBody: { color: '#cbd5e1', fontSize: 13, lineHeight: 19 },
  nextCard: {
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    gap: 4,
  },
  nextLabel: { color: '#818cf8', fontSize: 10, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  nextText: { color: '#f8fafc', fontSize: 13, lineHeight: 19, fontWeight: '700' },
  sectionHeader: { gap: 2, marginTop: 4 },
  sectionTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '900' },
  sectionAction: { color: '#64748b', fontSize: 12 },
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  modeCard: {
    width: '48.5%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.035)',
    padding: 14,
    gap: 8,
  },
  modeChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeChipText: { fontSize: 14, fontWeight: '900' },
  modeTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '900' },
  modeBody: { color: '#94a3b8', fontSize: 12, lineHeight: 17 },
  emptyCard: {
    borderRadius: 8,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 5,
  },
  emptyTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '900' },
  emptyBody: { color: '#94a3b8', fontSize: 13, lineHeight: 19 },
  recapList: { gap: 10 },
  recapCard: {
    borderRadius: 8,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 6,
  },
  recapTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  recapTitle: { flex: 1, color: '#f8fafc', fontSize: 15, fontWeight: '900' },
  recapScore: { color: '#818cf8', fontSize: 14, fontWeight: '900' },
  recapSubtitle: { color: '#64748b', fontSize: 12 },
  recapSummary: { color: '#cbd5e1', fontSize: 13, lineHeight: 19 },
});
