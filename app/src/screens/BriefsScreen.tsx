import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  Share,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ConversationMode, SessionRecap } from '../types';
import { loadSessionRecaps } from '../utils/sessionArchive';
import { PrepBriefCard } from '../components/PrepBriefCard';
import { SessionPreflightCard } from '../components/SessionPreflightCard';
import { appendCustomPlaybook, type SavedPlaybook } from '../utils/playbookStorage';
import { scheduleFollowUpReminder } from '../hooks/useNotifications';
import { scheduleFollowUps } from '../utils/followUpScheduler';
import { fetchMemoryBrief, type MemorySnapshot } from '../services/memory';

type Mode = {
  id: ConversationMode;
  icon: string;
  label: string;
  accent: string;
  description: string;
};

const MODES: Mode[] = [
  { id: 'sales',              icon: '🤝', label: 'Sales',      accent: '#6366f1', description: 'Objections, closes, and follow-up.' },
  { id: 'dating',             icon: '✨', label: 'Dating',     accent: '#ec4899', description: 'Momentum, presence, and next steps.' },
  { id: 'networking',         icon: '💬', label: 'Networking', accent: '#22d3ee', description: 'Rooms, intros, and useful follow-up.' },
  { id: 'pitching',           icon: '🚀', label: 'Pitching',   accent: '#f59e0b', description: 'Delivery, proof, and Q&A.' },
  { id: 'hard_conversations', icon: '⚡', label: 'Hard Talk',  accent: '#8b5cf6', description: 'Boundaries, calm, and clarity.' },
];

type Tab = 'now' | 'recap' | 'saved';

type Props = {
  onBack: () => void;
  onStartMode: (modeId: string) => void;
};

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? '#4ade80' : score >= 60 ? '#f59e0b' : '#f43f5e';
  const label = score >= 80 ? 'Strong' : score >= 60 ? 'Good' : 'Needs work';
  return (
    <View style={sr.wrap}>
      <View style={[sr.ring, { borderColor: color }]}>
        <Text style={[sr.value, { color }]}>{score}</Text>
      </View>
      <Text style={[sr.label, { color }]}>{label}</Text>
    </View>
  );
}

export function BriefsScreen({ onBack, onStartMode }: Props) {
  const [recentRecaps, setRecentRecaps] = useState<SessionRecap[]>([]);
  const [memorySnapshot, setMemorySnapshot] = useState<MemorySnapshot | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('now');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    loadSessionRecaps(8).then(setRecentRecaps);
    fetchMemoryBrief().then(setMemorySnapshot).catch(() => setMemorySnapshot(null));
  }, []);

  const latestRecap = recentRecaps[0] ?? null;
  const latestFollowUp = latestRecap?.followUps?.[0] ?? null;
  const followUpQueue = useMemo(() => (
    recentRecaps
      .flatMap((recap) => recap.followUps?.map((followUp) => ({ recap, followUp })) ?? [])
      .slice(0, 5)
  ), [recentRecaps]);

  const scheduleRecapFollowUps = async (recap: SessionRecap) => {
    const scheduled = await scheduleFollowUps(recap.followUps, {
      title: recap.title,
      identifierPrefix: `wingman-follow-${recap.id}`,
    });
    Alert.alert(
      scheduled > 0 ? 'Follow-ups scheduled' : 'No follow-ups',
      scheduled > 0
        ? `${scheduled} reminder${scheduled === 1 ? '' : 's'} set from this brief.`
        : 'This brief does not have follow-up items to schedule.'
    );
  };

  const nextUp = useMemo(() => {
    if (!latestRecap) {
      return memorySnapshot?.brief.nextMove
        ?? 'Run a session and this page will keep the last prep brief, recap, and next move together.';
    }
    return latestRecap.followUps?.[0]?.text
      ?? latestRecap.improvements?.[0]
      ?? latestRecap.highlights[0]
      ?? latestRecap.summary;
  }, [latestRecap, memorySnapshot]);

  const handleSavePlaybook = async () => {
    if (!latestRecap) return;
    const playbook: SavedPlaybook = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: latestRecap.title,
      mode: latestRecap.mode,
      description: latestRecap.summary,
      goal: latestRecap.followUps?.[0]?.text ?? latestRecap.improvements?.[0] ?? latestRecap.subtitle,
      notes: latestRecap.highlights.join('\n'),
      pinned: true,
      createdAt: new Date().toISOString(),
    };
    await appendCustomPlaybook(playbook);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <View style={s.root}>
      <LinearGradient colors={['#090914', '#050510']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={s.safe}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={onBack} style={s.backBtn} activeOpacity={0.8}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={s.headerCopy}>
            <Text style={s.title}>Briefs</Text>
          </View>
          <View style={s.headerSpacer} />
        </View>

        {/* Tabs */}
        <View style={s.tabRow}>
          {([
            { id: 'now', label: 'Now' },
            { id: 'recap', label: 'Recap' },
            { id: 'saved', label: 'Saved' },
          ] as { id: Tab; label: string }[]).map((tab) => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[s.tab, activeTab === tab.id && s.tabActive]}
              activeOpacity={0.8}
            >
              <Text style={[s.tabText, activeTab === tab.id && s.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          {/* ── NOW TAB ── */}
          {activeTab === 'now' && (
            <>
              <SessionPreflightCard />
              <PrepBriefCard
                latestRecap={latestRecap}
                onResumeMode={latestRecap ? (mode) => onStartMode(mode) : undefined}
              />

              {/* Next move */}
              <View style={s.nextCard}>
                <Text style={s.nextLabel}>NEXT MOVE</Text>
                <Text style={s.nextText}>{nextUp}</Text>
              </View>

              {/* Memory snapshot */}
              {memorySnapshot ? (
                <View style={s.card}>
                  <SectionHeader title="Conversation memory" sub="Reusable context from prior sessions" />
                  <Text style={s.bodyText}>{memorySnapshot.brief.summary}</Text>
                  <View style={s.memoryGrid}>
                    <MemoryGroup title="Interests" items={memorySnapshot.memory.interests} />
                    <MemoryGroup title="Details" items={memorySnapshot.memory.personalDetails} />
                    <MemoryGroup title="Callbacks" items={memorySnapshot.memory.callbackTopics} />
                  </View>
                  {memorySnapshot.followUps.length > 0 && (
                    <TouchableOpacity
                      onPress={async () => {
                        const scheduled = await scheduleFollowUps(memorySnapshot.followUps, {
                          title: memorySnapshot.brief.title,
                          identifierPrefix: `wingman-memory-${memorySnapshot.brief.title.replace(/\s+/g, '-').toLowerCase()}`,
                        });
                        Alert.alert(
                          scheduled > 0 ? 'Follow-ups scheduled' : 'No follow-ups',
                          scheduled > 0
                            ? `${scheduled} reminder${scheduled === 1 ? '' : 's'} set from memory.`
                            : 'The stored memory does not have follow-up items to schedule.'
                        );
                      }}
                      style={s.actionBtn}
                      activeOpacity={0.82}
                    >
                      <Text style={s.actionBtnText}>Schedule memory follow-ups</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null}

              {/* Follow-up action */}
              {latestFollowUp ? (
                <View style={s.card}>
                  <SectionHeader title="Follow-up" sub="Turn the recap into a reminder" />
                  <Text style={s.bodyText}>{latestFollowUp.text}</Text>
                  <View style={s.chipRow}>
                    <TouchableOpacity
                      onPress={async () => {
                        await scheduleFollowUpReminder({
                          title: 'Wingman follow-up',
                          body: latestFollowUp.text,
                          hours: 24,
                        });
                      }}
                      style={s.chip}
                      activeOpacity={0.82}
                    >
                      <Text style={s.chipText}>Remind tomorrow</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={async () => {
                        await Share.share({ message: latestFollowUp.text }).catch(() => {});
                      }}
                      style={s.chip}
                      activeOpacity={0.82}
                    >
                      <Text style={s.chipText}>Export text</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => latestRecap && scheduleRecapFollowUps(latestRecap)}
                      style={s.chip}
                      activeOpacity={0.82}
                    >
                      <Text style={s.chipText}>Schedule all</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}

              {/* Quick start */}
              <SectionHeader title="Quick start" sub="Jump back into a mode" />
              <View style={s.modeGrid}>
                {MODES.map((mode) => (
                  <TouchableOpacity
                    key={mode.id}
                    onPress={() => onStartMode(mode.id)}
                    style={s.modeTileWrapper}
                    activeOpacity={0.82}
                  >
                    <View style={s.modeTile}>
                      <View style={[s.modeTileBar, { backgroundColor: mode.accent }]} />
                      <LinearGradient
                        colors={[`${mode.accent}25`, 'transparent']}
                        style={s.modeTileGradient}
                      />
                      <View style={s.modeTileInner}>
                        <View style={[s.modeIconWrap, { borderColor: `${mode.accent}44`, backgroundColor: `${mode.accent}15` }]}>
                          <Text style={s.modeIconEmoji}>{mode.icon}</Text>
                        </View>
                        <Text style={s.modeTitle}>{mode.label}</Text>
                        <Text style={s.modeBody}>{mode.description}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* ── RECAP TAB ── */}
          {activeTab === 'recap' && (
            <>
              {/* Save as playbook */}
              {latestRecap && (
                <TouchableOpacity
                  style={[s.savePlaybookCard, savedSuccess && s.savePlaybookCardDone]}
                  activeOpacity={0.82}
                  onPress={handleSavePlaybook}
                >
                  <Text style={s.savePlaybookLabel}>Save as playbook</Text>
                  <Text style={s.savePlaybookTitle}>
                    {savedSuccess ? '✓ Saved to playbooks!' : 'Turn this brief into a reusable setup.'}
                  </Text>
                  {!savedSuccess && (
                    <Text style={s.savePlaybookBody}>
                      Pin the last good version and reuse it next time.
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              {/* Action queue */}
              {followUpQueue.length > 0 && (
                <View style={s.card}>
                  <SectionHeader title="Action queue" sub="Recent follow-ups, ready to revisit" />
                  <View style={s.queueList}>
                    {followUpQueue.map(({ recap, followUp }, index) => (
                      <View key={`${recap.id}-${index}`} style={s.queueItem}>
                        <Text style={s.queueMode}>{recap.title}</Text>
                        <Text style={s.queueText}>{followUp.text}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Recaps */}
              <SectionHeader title="Recent recaps" sub="Keep the last few in view" />
              {recentRecaps.length === 0 ? (
                <View style={s.emptyCard}>
                  <Text style={s.emptyTitle}>No recaps yet</Text>
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
                        <ScoreRing score={recap.score} />
                      </View>
                      <Text style={s.recapSubtitle} numberOfLines={1}>{recap.subtitle}</Text>
                      <Text style={s.recapSummary} numberOfLines={3}>{recap.summary}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}

          {/* ── SAVED TAB ── */}
          {activeTab === 'saved' && (
            <>
              <View style={s.emptyCard}>
                <Text style={s.emptyTitle}>Playbooks live here</Text>
                <Text style={s.emptyBody}>Save a recap as a playbook from the Recap tab to pin it here for quick reuse.</Text>
                <TouchableOpacity
                  onPress={() => setActiveTab('recap')}
                  style={[s.actionBtn, { marginTop: 12 }]}
                  activeOpacity={0.82}
                >
                  <Text style={s.actionBtnText}>Go to Recap tab</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function MemoryGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <View style={s.memoryGroup}>
      <Text style={s.memoryGroupTitle}>{title}</Text>
      {items.length > 0 ? (
        items.slice(0, 3).map((item) => (
          <Text key={item} style={s.memoryItem} numberOfLines={2}>{item}</Text>
        ))
      ) : (
        <Text style={s.memoryEmpty}>Nothing saved yet.</Text>
      )}
    </View>
  );
}

function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTitle}>{title}</Text>
      <Text style={s.sectionSub}>{sub}</Text>
    </View>
  );
}

const sr = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 2 },
  ring: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { fontSize: 14, fontWeight: '900' },
  label: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050510' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 8,
  },
  backBtn: {
    paddingHorizontal: 4,
    paddingVertical: 8,
    minWidth: 64,
  },
  backText: { color: '#818cf8', fontSize: 14, fontWeight: '800' },
  headerCopy: { flex: 1, alignItems: 'center' },
  title: { color: '#f8fafc', fontSize: 20, fontWeight: '900' },
  headerSpacer: { width: 64 },

  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 18,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  tabActive: {
    backgroundColor: 'rgba(99,102,241,0.18)',
    borderColor: 'rgba(129,140,248,0.4)',
  },
  tabText: { color: '#64748b', fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: '#f8fafc' },

  content: { paddingHorizontal: 18, paddingBottom: 120, gap: 14 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },

  sectionHeader: { gap: 2, marginTop: 4 },
  sectionTitle: { color: '#f8fafc', fontSize: 17, fontWeight: '800' },
  sectionSub: { color: '#64748b', fontSize: 12 },

  bodyText: { color: '#cbd5e1', fontSize: 13, lineHeight: 19 },

  nextCard: {
    borderRadius: 12,
    backgroundColor: 'rgba(129,140,248,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.22)',
    padding: 16,
    gap: 6,
  },
  nextLabel: { color: '#818cf8', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  nextText: { color: '#f8fafc', fontSize: 14, lineHeight: 20, fontWeight: '700' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  chipText: { color: '#e2e8f0', fontSize: 12, fontWeight: '800' },

  actionBtn: {
    backgroundColor: 'rgba(99,102,241,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.24)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionBtnText: { color: '#eef2ff', fontSize: 13, fontWeight: '800' },

  memoryGrid: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  memoryGroup: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 100,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    padding: 10,
    gap: 5,
  },
  memoryGroupTitle: { color: '#f8fafc', fontSize: 11, fontWeight: '800' },
  memoryItem: { color: '#cbd5e1', fontSize: 11, lineHeight: 15 },
  memoryEmpty: { color: '#64748b', fontSize: 11, lineHeight: 15 },

  savePlaybookCard: {
    borderRadius: 12,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
    padding: 16,
    gap: 6,
  },
  savePlaybookCardDone: {
    backgroundColor: 'rgba(74,222,128,0.08)',
    borderColor: 'rgba(74,222,128,0.2)',
  },
  savePlaybookLabel: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  savePlaybookTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '800' },
  savePlaybookBody: { color: '#cbd5e1', fontSize: 12, lineHeight: 17 },

  queueList: { gap: 10 },
  queueItem: {
    gap: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 12,
  },
  queueMode: { color: '#818cf8', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  queueText: { color: '#cbd5e1', fontSize: 13, lineHeight: 18 },

  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  modeTileWrapper: { width: '47.5%' },
  modeTile: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  modeTileBar: { height: 2.5, width: '100%' },
  modeTileGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 60 },
  modeTileInner: { padding: 14, gap: 6 },
  modeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIconEmoji: { fontSize: 18 },
  modeTitle: { color: '#f8fafc', fontSize: 14, fontWeight: '800' },
  modeBody: { color: '#94a3b8', fontSize: 11, lineHeight: 15 },

  emptyCard: {
    borderRadius: 12,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 6,
  },
  emptyTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '800' },
  emptyBody: { color: '#94a3b8', fontSize: 13, lineHeight: 19 },

  recapList: { gap: 10 },
  recapCard: {
    borderRadius: 12,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  recapTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  recapTitle: { flex: 1, color: '#f8fafc', fontSize: 15, fontWeight: '800' },
  recapSubtitle: { color: '#64748b', fontSize: 12 },
  recapSummary: { color: '#cbd5e1', fontSize: 13, lineHeight: 19 },
});
