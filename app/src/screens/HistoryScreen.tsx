import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  View, Text, TextInput, TouchableOpacity, StyleSheet, Share,
  SafeAreaView, ScrollView, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { listSessionsSnapshot, type SessionSnapshotSource, SavedSession } from '../services/sessionService';
import { ConversationMode } from '../types';
import { loadBookmarks, removeBookmark, saveBookmark, type SavedBookmark } from '../utils/bookmarks';
import { scheduleFollowUpReminder } from '../hooks/useNotifications';
import { scheduleFollowUps } from '../utils/followUpScheduler';
import { SessionTranscriptExplorer } from '../components/SessionTranscriptExplorer';

const MODE_META: Record<string, { icon: string; label: string; accent: string }> = {
  sales: { icon: 'S', label: 'Sales', accent: '#6366f1' },
  dating: { icon: 'D', label: 'Dating', accent: '#ec4899' },
  networking: { icon: 'N', label: 'Networking', accent: '#22d3ee' },
  pitching: { icon: 'P', label: 'Pitching', accent: '#f59e0b' },
  hard_conversations: { icon: 'H', label: 'Hard Talk', accent: '#8b5cf6' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`;
}

interface Props {
  onBack: () => void;
  onStartMode: (mode: ConversationMode) => void;
}

export function HistoryScreen({ onBack, onStartMode }: Props) {
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [sessionsSource, setSessionsSource] = useState<SessionSnapshotSource>('empty');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [bookmarks, setBookmarks] = useState<SavedBookmark[]>([]);

  useEffect(() => {
    listSessionsSnapshot().then(({ sessions: data, source }) => {
      setSessions(data);
      setSessionsSource(source);
      setLoading(false);
    });
    loadBookmarks().then(setBookmarks);
  }, []);

  const dashboard = useMemo(() => {
    const total = sessions.length;
    const avgScore = total
      ? Math.round(sessions.reduce((sum, s) => sum + s.score, 0) / total)
      : 0;
    const totalTips = sessions.reduce((sum, s) => sum + s.coachingCount, 0);
    const best = sessions.reduce<SavedSession | null>((current, s) => (
      !current || s.score > current.score ? s : current
    ), null);
    const modes = sessions.reduce<Record<string, number>>((acc, s) => {
      acc[s.mode] = (acc[s.mode] ?? 0) + 1;
      return acc;
    }, {});
    const topMode = Object.entries(modes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const improvement = sessions[0] && sessions[sessions.length - 1]
      ? sessions[0].score - sessions[sessions.length - 1].score
      : 0;
    return { total, avgScore, totalTips, best, topMode, improvement };
  }, [sessions]);

  const modeTrends = useMemo(() => {
    const buckets = sessions.reduce<Record<string, SavedSession[]>>((acc, session) => {
      acc[session.mode] = acc[session.mode] ?? [];
      acc[session.mode].push(session);
      return acc;
    }, {});
    return Object.entries(buckets)
      .map(([mode, items]) => {
        const avg = Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length);
        const recent = items[0]?.score ?? 0;
        const baseline = items[items.length - 1]?.score ?? recent;
        return { mode, avg, count: items.length, delta: recent - baseline };
      })
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 4);
  }, [sessions]);

  const sessionMomentum = useMemo(() => {
    const recent = sessions.slice(0, 3);
    const prior = sessions.slice(3, 6);
    const recentAvg = recent.length ? Math.round(recent.reduce((sum, item) => sum + item.score, 0) / recent.length) : 0;
    const priorAvg = prior.length ? Math.round(prior.reduce((sum, item) => sum + item.score, 0) / prior.length) : 0;
    return { recentAvg, priorAvg, delta: recentAvg - priorAvg };
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((session) => {
      const haystack = [
        session.title,
        session.mode,
        session.analysis?.summary,
        session.analysis?.keyMoment,
        session.analysis?.strengths.join(' '),
        session.analysis?.improvements.join(' '),
        session.analysis?.followUps.map((item) => item.text).join(' '),
        session.transcriptText,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [search, sessions]);

  const grouped = filteredSessions.reduce<Array<{ label: string; items: SavedSession[] }>>((acc, session) => {
    const label = formatDate(session.createdAt);
    const last = acc[acc.length - 1];
    if (last?.label === label) last.items.push(session);
    else acc.push({ label, items: [session] });
    return acc;
  }, []);

  const latestSession = filteredSessions[0] ?? sessions[0] ?? null;
  const latestFollowUp = latestSession?.analysis?.followUps?.[0] ?? null;
  const followUpQueue = useMemo(() => (
    sessions
      .flatMap((session) => session.analysis?.followUps?.map((followUp) => ({
        session,
        followUp,
      })) ?? [])
      .slice(0, 6)
  ), [sessions]);

  const scheduleRecapFollowUps = async (session: SavedSession) => {
    const scheduled = await scheduleFollowUps(session.analysis?.followUps, {
      title: session.title || MODE_META[session.mode]?.label || 'Session',
      identifierPrefix: `wingman-follow-${session.id}`,
    });
    if (scheduled === 0) {
      Alert.alert('No follow-ups', 'This session does not have follow-up items to schedule.');
    } else {
      Alert.alert('Follow-ups scheduled', `${scheduled} reminder${scheduled === 1 ? '' : 's'} set from this recap.`);
    }
  };

  const buildShareText = (session: SavedSession): string => {
    const parts = [
      `${session.title || MODE_META[session.mode]?.label || 'Session'} · ${session.score}`,
      `Duration: ${formatDuration(session.durationSeconds)} · Tips: ${session.coachingCount}`,
      session.analysis?.summary,
      session.analysis?.strengths?.length ? `What worked: ${session.analysis.strengths.join('; ')}` : null,
      session.analysis?.improvements?.length ? `Next time: ${session.analysis.improvements.join('; ')}` : null,
      session.analysis?.memory?.interests?.length ? `Interests: ${session.analysis.memory.interests.join('; ')}` : null,
      session.analysis?.memory?.personalDetails?.length ? `Personal details: ${session.analysis.memory.personalDetails.join('; ')}` : null,
      session.analysis?.memory?.callbackTopics?.length ? `Callbacks: ${session.analysis.memory.callbackTopics.join('; ')}` : null,
      session.analysis?.secondDatePrep?.nextDateIdea ? `Next date: ${session.analysis.secondDatePrep.nextDateIdea}` : null,
      session.analysis?.followUps?.length ? `Follow-up: ${session.analysis.followUps[0].text}` : null,
      session.transcriptText ? `Transcript: ${session.transcriptText.slice(0, 1200)}` : null,
    ].filter(Boolean);
    return parts.join('\n\n');
  };

  const shareSession = async (session: SavedSession) => {
    await Share.share({ message: buildShareText(session) }).catch(() => {});
  };

  const buildPdfHtml = (session: SavedSession): string => {
    const title = session.title || MODE_META[session.mode]?.label || 'Session';
    const followUps = session.analysis?.followUps ?? [];
    const strengths = session.analysis?.strengths ?? [];
    const improvements = session.analysis?.improvements ?? [];
    const memory = session.analysis?.memory;
    const secondDatePrep = session.analysis?.secondDatePrep;
    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 32px; color: #0f172a; }
            h1 { margin: 0 0 8px; font-size: 28px; }
            .meta { color: #475569; margin-bottom: 18px; font-size: 13px; }
            .section { margin-top: 22px; }
            .label { text-transform: uppercase; letter-spacing: 1px; font-size: 11px; color: #6366f1; font-weight: 700; margin-bottom: 8px; }
            .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-bottom: 10px; }
            .body { font-size: 14px; line-height: 1.6; color: #0f172a; }
            .small { font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="meta">${formatDate(session.createdAt)} · ${formatDuration(session.durationSeconds)} · score ${session.score} · ${session.coachingCount} tips</div>
          <div class="section">
            <div class="label">Summary</div>
            <div class="card body">${session.analysis?.summary ?? 'No summary available.'}</div>
          </div>
          ${strengths.length ? `
            <div class="section">
              <div class="label">Strengths</div>
              ${strengths.map((item) => `<div class="card body">${item}</div>`).join('')}
            </div>` : ''}
          ${improvements.length ? `
            <div class="section">
              <div class="label">Improve next</div>
              ${improvements.map((item) => `<div class="card body">${item}</div>`).join('')}
            </div>` : ''}
          ${followUps.length ? `
            <div class="section">
              <div class="label">Follow-up</div>
              ${followUps.map((item) => `<div class="card body">${item.timing}: ${item.text}</div>`).join('')}
            </div>` : ''}
          ${memory?.interests?.length || memory?.personalDetails?.length || memory?.callbackTopics?.length ? `
            <div class="section">
              <div class="label">Date memory</div>
              ${memory?.interests?.length ? `<div class="card body"><strong>Interests</strong><br/>${memory.interests.join('<br/>')}</div>` : ''}
              ${memory?.personalDetails?.length ? `<div class="card body"><strong>Personal details</strong><br/>${memory.personalDetails.join('<br/>')}</div>` : ''}
              ${memory?.callbackTopics?.length ? `<div class="card body"><strong>Callbacks</strong><br/>${memory.callbackTopics.join('<br/>')}</div>` : ''}
            </div>` : ''}
          ${secondDatePrep?.nextDateIdea || secondDatePrep?.recommendations?.length || secondDatePrep?.conversationStarters?.length || secondDatePrep?.remember?.length ? `
            <div class="section">
              <div class="label">Second date prep</div>
              ${secondDatePrep?.nextDateIdea ? `<div class="card body"><strong>Next date idea</strong><br/>${secondDatePrep.nextDateIdea}</div>` : ''}
              ${secondDatePrep?.recommendations?.length ? `<div class="card body"><strong>Recommendations</strong><br/>${secondDatePrep.recommendations.join('<br/>')}</div>` : ''}
              ${secondDatePrep?.conversationStarters?.length ? `<div class="card body"><strong>Callbacks</strong><br/>${secondDatePrep.conversationStarters.join('<br/>')}</div>` : ''}
              ${secondDatePrep?.remember?.length ? `<div class="card body"><strong>Remember</strong><br/>${secondDatePrep.remember.join('<br/>')}</div>` : ''}
            </div>` : ''}
          <div class="section">
            <div class="label">Transcript</div>
            <div class="card body">${(session.transcriptText || 'No transcript captured.').replace(/\n/g, '<br/>')}</div>
          </div>
        </body>
      </html>
    `;
  };

  const exportSessionPdf = async (session: SavedSession) => {
    try {
      const file = await Print.printToFileAsync({ html: buildPdfHtml(session) });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
        });
      } else {
        await Share.share({ url: file.uri, message: buildShareText(session) }).catch(() => {});
      }
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Could not create the PDF export.');
    }
  };

  const bookmarkExcerpt = async (session: SavedSession, excerpt?: string) => {
    const excerptText = excerpt ?? session.transcriptText?.slice(0, 260) ?? '';
    const next = await saveBookmark({
      sessionId: session.id,
      title: session.title || MODE_META[session.mode]?.label || 'Session',
      excerpt: excerptText || 'No transcript text captured for this session.',
    });
    setBookmarks(next);
  };

  const deleteBookmark = async (id: string) => {
    const next = await removeBookmark(id);
    setBookmarks(next);
  };

  return (
    <View style={st.root}>
      <LinearGradient colors={['#090914', '#050510']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={st.safe}>
        <View style={st.header}>
          <TouchableOpacity onPress={onBack} style={st.backBtn} hitSlop={10}>
            <Text style={st.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={st.title}>Coaching History</Text>
          <View style={st.headerSpacer} />
        </View>

        {loading ? (
          <View style={st.loadingWrapper}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={st.loadingText}>Loading sessions...</Text>
          </View>
        ) : sessions.length === 0 ? (
          <View style={st.empty}>
            <Text style={st.emptyTitle}>No sessions yet</Text>
            <Text style={st.emptyBody}>Complete a live session or practice run to start tracking your improvement.</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.list}>
            <View style={st.searchCard}>
              <Text style={st.searchLabel}>Search history</Text>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search sessions, transcript, advice..."
                placeholderTextColor="#475569"
                style={st.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              <Text style={st.searchHint}>
                {search.trim()
                  ? `${filteredSessions.length} matching session${filteredSessions.length === 1 ? '' : 's'}`
                  : 'Search titles, analysis, follow-ups, and transcript text.'}
              </Text>
              {sessionsSource === 'cache' ? (
                <Text style={st.cacheNotice}>Showing cached sessions until the backend is reachable again.</Text>
              ) : null}
            </View>

            <View style={st.dashboard}>
              <Text style={st.dashboardTitle}>Progress dashboard</Text>
              <View style={st.metricRow}>
                <Metric label="Sessions" value={dashboard.total.toString()} />
                <Metric label="Avg score" value={dashboard.avgScore.toString()} />
                <Metric label="Tips" value={dashboard.totalTips.toString()} />
              </View>
              {latestSession ? (
                <View style={st.quickActions}>
                  <TouchableOpacity
                    onPress={() => onStartMode(latestSession.mode as ConversationMode)}
                    style={st.quickPrimary}
                    activeOpacity={0.82}
                  >
                    <Text style={st.quickPrimaryText}>Run again</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => shareSession(latestSession)}
                    style={st.quickSecondary}
                    activeOpacity={0.82}
                  >
                    <Text style={st.quickSecondaryText}>Share last recap</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              <View style={st.insightCard}>
                <Text style={st.insightLabel}>Current focus</Text>
                <Text style={st.insightText}>
                  {dashboard.best
                    ? `Best result: ${dashboard.best.title || 'Session'} scored ${dashboard.best.score}. ${
                        dashboard.improvement > 0
                          ? `You are up ${dashboard.improvement} points from your oldest saved session.`
                          : 'Run two more sessions to see trend data.'
                      }`
                    : 'Run your first session to unlock coaching trends.'}
                </Text>
              </View>
              {dashboard.topMode ? (
                <View style={st.insightCard}>
                  <Text style={st.insightLabel}>Most practiced</Text>
                  <Text style={st.insightText}>{MODE_META[dashboard.topMode]?.label ?? dashboard.topMode}</Text>
                </View>
              ) : null}
              <View style={st.insightCard}>
                <Text style={st.insightLabel}>Momentum</Text>
                <Text style={st.insightText}>
                  {sessionMomentum.priorAvg > 0
                    ? `Latest three sessions average ${sessionMomentum.recentAvg}. ${sessionMomentum.delta >= 0 ? '+' : ''}${sessionMomentum.delta} versus the three before them.`
                    : 'Run a few more sessions to see a trend line.'}
                </Text>
              </View>
            </View>

            {followUpQueue.length > 0 ? (
              <View style={st.followQueuePanel}>
                <View style={st.sectionTop}>
                  <Text style={st.dashboardTitle}>Follow-up queue</Text>
                  <Text style={st.sectionMeta}>Most recent action items</Text>
                </View>
                <View style={st.followQueueList}>
                  {followUpQueue.map(({ session, followUp }, index) => (
                    <View key={`${session.id}-${followUp.timing}-${index}`} style={st.followQueueCard}>
                      <Text style={st.followQueueMode}>{MODE_META[session.mode]?.label ?? session.mode}</Text>
                      <Text style={st.followQueueText}>{followUp.text}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  onPress={() => latestSession && scheduleRecapFollowUps(latestSession)}
                  style={st.queueScheduleBtn}
                  activeOpacity={0.82}
                >
                  <Text style={st.queueScheduleBtnText}>Schedule all follow-ups</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {modeTrends.length > 0 ? (
              <View style={st.trendPanel}>
                <View style={st.sectionTop}>
                  <Text style={st.dashboardTitle}>Mode trends</Text>
                  <Text style={st.sectionMeta}>Average score and momentum</Text>
                </View>
                <View style={st.trendList}>
                  {modeTrends.map((trend) => (
                    <View key={trend.mode} style={st.trendCard}>
                      <Text style={st.trendMode}>{MODE_META[trend.mode]?.label ?? trend.mode}</Text>
                      <Text style={st.trendScore}>Avg {trend.avg}</Text>
                      <Text style={st.trendMeta}>
                        {trend.count} session{trend.count === 1 ? '' : 's'} · {trend.delta >= 0 ? '+' : ''}
                        {trend.delta} recent delta
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {bookmarks.length > 0 ? (
              <View style={st.bookmarkPanel}>
                <View style={st.sectionTop}>
                  <Text style={st.dashboardTitle}>Saved moments</Text>
                  <Text style={st.sectionMeta}>{bookmarks.length} saved</Text>
                </View>
                <View style={st.bookmarkList}>
                  {bookmarks.slice(0, 5).map((bookmark) => (
                    <View key={bookmark.id} style={st.bookmarkCard}>
                      <View style={st.bookmarkHeader}>
                        <Text style={st.bookmarkTitle} numberOfLines={1}>{bookmark.title}</Text>
                        <Text style={st.bookmarkTime}>{formatDate(bookmark.createdAt)}</Text>
                      </View>
                      <Text style={st.bookmarkExcerpt} numberOfLines={3}>{bookmark.excerpt}</Text>
                      <View style={st.bookmarkActions}>
                        <TouchableOpacity
                          onPress={() => Share.share({ message: `${bookmark.title}\n\n${bookmark.excerpt}` }).catch(() => {})}
                          style={st.bookmarkBtn}
                          activeOpacity={0.82}
                        >
                          <Text style={st.bookmarkBtnText}>Share</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => deleteBookmark(bookmark.id)}
                          style={st.bookmarkBtn}
                          activeOpacity={0.82}
                        >
                          <Text style={st.bookmarkBtnText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {latestFollowUp ? (
              <View style={st.followUpPanel}>
                <View style={st.sectionTop}>
                  <Text style={st.dashboardTitle}>Follow-up focus</Text>
                  <Text style={st.sectionMeta}>{latestSession?.title || 'Latest session'}</Text>
                </View>
                <Text style={st.followUpText}>{latestFollowUp.text}</Text>
                <View style={st.followUpActions}>
                  <TouchableOpacity
                    onPress={async () => {
                      await scheduleFollowUpReminder({
                        title: 'Wingman follow-up',
                        body: latestFollowUp.text,
                        hours: 24,
                      });
                    }}
                    style={st.followUpBtn}
                    activeOpacity={0.82}
                  >
                    <Text style={st.followUpBtnText}>Remind tomorrow</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => Share.share({ message: latestFollowUp.text }).catch(() => {})}
                    style={st.followUpBtn}
                    activeOpacity={0.82}
                  >
                    <Text style={st.followUpBtnText}>Share follow-up</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => latestSession && scheduleRecapFollowUps(latestSession)}
                    style={st.followUpBtn}
                    activeOpacity={0.82}
                  >
                    <Text style={st.followUpBtnText}>Schedule all</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {grouped.map((group) => (
              <View key={group.label}>
                <Text style={st.groupLabel}>{group.label}</Text>
                {group.items.map((session) => {
                  const meta = MODE_META[session.mode] ?? { icon: 'W', label: session.mode, accent: '#6366f1' };
                  const isOpen = expanded === session.id;
                  return (
                    <TouchableOpacity
                      key={session.id}
                      onPress={() => setExpanded(isOpen ? null : session.id)}
                      activeOpacity={0.82}
                      style={st.card}
                    >
                      <View style={[st.cardInner, { borderLeftColor: meta.accent }]}>
                        <View style={st.cardRow}>
                          <View style={[st.modeIcon, { backgroundColor: `${meta.accent}20`, borderColor: `${meta.accent}66` }]}>
                            <Text style={[st.modeIconText, { color: meta.accent }]}>{meta.icon}</Text>
                          </View>
                          <View style={st.cardMid}>
                            <Text style={st.cardTitle} numberOfLines={1}>{session.title || meta.label}</Text>
                            <Text style={st.cardSub}>
                              {formatDuration(session.durationSeconds)} · {session.coachingCount} tips · score {session.score}
                            </Text>
                          </View>
                          <Text style={[st.cardArrow, { color: meta.accent }]}>{isOpen ? 'Hide' : 'View'}</Text>
                        </View>

                        {isOpen && session.analysis ? (
                          <View style={st.analysis}>
                            <Text style={st.analysisSummary}>{session.analysis.summary}</Text>
                            {session.analysis.strengths.length > 0 ? (
                              <View style={st.analysisSection}>
                                <Text style={[st.analysisSectionLabel, { color: meta.accent }]}>Strengths</Text>
                                {session.analysis.strengths.map((item, index) => (
                                  <Text key={index} style={st.analysisItem}>- {item}</Text>
                                ))}
                              </View>
                            ) : null}
                            {session.analysis.improvements.length > 0 ? (
                              <View style={st.analysisSection}>
                                <Text style={[st.analysisSectionLabel, { color: meta.accent }]}>Improve next</Text>
                                {session.analysis.improvements.map((item, index) => (
                                  <Text key={index} style={st.analysisItem}>- {item}</Text>
                                ))}
                              </View>
                            ) : null}
                            {session.analysis.keyMoment ? (
                              <Text style={st.analysisKeyMoment}>Key moment: {session.analysis.keyMoment}</Text>
                            ) : null}
                            {session.analysis.memory ? (
                              <View style={st.analysisSection}>
                                <Text style={[st.analysisSectionLabel, { color: meta.accent }]}>Memory</Text>
                                {session.analysis.memory.interests?.length > 0 ? (
                                  <View style={st.followRow}>
                                    <Text style={st.followTiming}>Interests</Text>
                                    {session.analysis.memory.interests.map((item, index) => (
                                      <Text key={`interest-${index}`} style={st.followText}>• {item}</Text>
                                    ))}
                                  </View>
                                ) : null}
                                {session.analysis.memory.personalDetails?.length > 0 ? (
                                  <View style={st.followRow}>
                                    <Text style={st.followTiming}>Personal details</Text>
                                    {session.analysis.memory.personalDetails.map((item, index) => (
                                      <Text key={`detail-${index}`} style={st.followText}>• {item}</Text>
                                    ))}
                                  </View>
                                ) : null}
                                {session.analysis.memory.callbackTopics?.length > 0 ? (
                                  <View style={st.followRow}>
                                    <Text style={st.followTiming}>Callbacks</Text>
                                    {session.analysis.memory.callbackTopics.map((item, index) => (
                                      <Text key={`callback-${index}`} style={st.followText}>• {item}</Text>
                                    ))}
                                  </View>
                                ) : null}
                              </View>
                            ) : null}
                            <SessionTranscriptExplorer
                              title={session.title || meta.label}
                              transcriptText={session.transcriptText}
                              onBookmark={(excerpt) => bookmarkExcerpt(session, excerpt)}
                              onShare={(excerpt) => Share.share({ message: excerpt }).catch(() => {})}
                            />
                            {session.analysis.followUps.length > 0 ? (
                              <View style={st.analysisSection}>
                                <Text style={[st.analysisSectionLabel, { color: meta.accent }]}>Next moves</Text>
                                {session.analysis.followUps.map((item, index) => (
                                  <View key={index} style={st.followRow}>
                                    <Text style={[st.followTiming, { color: meta.accent }]}>{item.timing}</Text>
                                    <Text style={st.followText}>{item.text}</Text>
                                  </View>
                                ))}
                              </View>
                            ) : null}
                            <View style={st.cardActions}>
                              <TouchableOpacity
                                onPress={() => onStartMode(session.mode as ConversationMode)}
                                style={[st.cardActionBtn, { borderColor: meta.accent }]}
                                activeOpacity={0.8}
                              >
                                <Text style={[st.cardActionText, { color: meta.accent }]}>Run again</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => shareSession(session)}
                                style={st.cardActionBtn}
                                activeOpacity={0.8}
                              >
                                <Text style={st.cardActionText}>Share recap</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => Share.share({ message: session.transcriptText || buildShareText(session) }).catch(() => {})}
                                style={st.cardActionBtn}
                                activeOpacity={0.8}
                              >
                                <Text style={st.cardActionText}>Share transcript</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => bookmarkExcerpt(session)}
                                style={st.cardActionBtn}
                                activeOpacity={0.8}
                              >
                                <Text style={st.cardActionText}>Bookmark excerpt</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : null}

                        {isOpen && !session.analysis ? (
                          <View style={st.analysis}>
                            <Text style={st.analysisSummary}>No analysis available for this session.</Text>
                          </View>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={st.metric}>
      <Text style={st.metricValue}>{value}</Text>
      <Text style={st.metricLabel}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050510' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: { minWidth: 64 },
  backText: { color: '#818cf8', fontSize: 15, fontWeight: '800' },
  title: { color: '#f8fafc', fontSize: 18, fontWeight: '900' },
  headerSpacer: { width: 64 },
  loadingWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { color: '#64748b', fontSize: 14 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  emptyTitle: { color: '#f8fafc', fontSize: 20, fontWeight: '900' },
  emptyBody: { color: '#94a3b8', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  list: { paddingHorizontal: 18, paddingBottom: 116, gap: 10 },
  searchCard: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 8,
    padding: 14,
    gap: 8,
  },
  searchLabel: { color: '#64748b', fontSize: 11, fontWeight: '900', letterSpacing: 0.4 },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 14,
  },
  searchHint: { color: '#64748b', fontSize: 11, lineHeight: 16 },
  cacheNotice: { color: '#fbbf24', fontSize: 11, lineHeight: 16, fontWeight: '700' },
  dashboard: {
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.2)',
    borderRadius: 8,
    padding: 16,
    gap: 12,
  },
  dashboardTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '900' },
  sectionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionMeta: { color: '#64748b', fontSize: 11, fontWeight: '700' },
  followQueuePanel: {
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 8,
    padding: 16,
  },
  followQueueList: { gap: 10 },
  followQueueCard: {
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: 12,
  },
  followQueueMode: { color: '#818cf8', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 },
  followQueueText: { color: '#e2e8f0', fontSize: 13, lineHeight: 18 },
  queueScheduleBtn: {
    marginTop: 2,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.22)',
    backgroundColor: 'rgba(129,140,248,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  queueScheduleBtnText: { color: '#c7d2fe', fontSize: 11, fontWeight: '900' },
  trendPanel: {
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 8,
    padding: 16,
  },
  trendList: { gap: 10 },
  trendCard: {
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: 12,
  },
  trendMode: { color: '#f8fafc', fontSize: 13, fontWeight: '900' },
  trendScore: { color: '#818cf8', fontSize: 13, fontWeight: '900' },
  trendMeta: { color: '#94a3b8', fontSize: 11, lineHeight: 16 },
  bookmarkPanel: {
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 8,
    padding: 16,
  },
  bookmarkList: { gap: 10 },
  bookmarkCard: {
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: 12,
  },
  bookmarkHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  bookmarkTitle: { flex: 1, color: '#f8fafc', fontSize: 14, fontWeight: '900' },
  bookmarkTime: { color: '#64748b', fontSize: 11, fontWeight: '700' },
  bookmarkExcerpt: { color: '#cbd5e1', fontSize: 12, lineHeight: 17 },
  bookmarkActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bookmarkBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bookmarkBtnText: { color: '#e2e8f0', fontSize: 11, fontWeight: '800' },
  followUpPanel: {
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 8,
    padding: 16,
  },
  followUpText: { color: '#e2e8f0', fontSize: 13, lineHeight: 19 },
  followUpActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  followUpBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.2)',
    backgroundColor: 'rgba(129,140,248,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  followUpBtnText: { color: '#c7d2fe', fontSize: 11, fontWeight: '800' },
  metricRow: { flexDirection: 'row', gap: 10 },
  metric: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
  },
  metricValue: { color: '#f8fafc', fontSize: 17, fontWeight: '900' },
  metricLabel: { color: '#94a3b8', fontSize: 11, marginTop: 3 },
  quickActions: { flexDirection: 'row', gap: 10 },
  quickPrimary: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 12,
  },
  quickPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  quickSecondary: {
    flex: 1.2,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 12,
  },
  quickSecondaryText: { color: '#e2e8f0', fontSize: 13, fontWeight: '800' },
  insightCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  insightLabel: { color: '#818cf8', fontSize: 11, fontWeight: '900' },
  insightText: { color: '#cbd5e1', fontSize: 13, lineHeight: 19 },
  groupLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 16,
    marginBottom: 6,
  },
  card: { borderRadius: 8, overflow: 'hidden', marginBottom: 8 },
  cardInner: {
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.075)',
    borderLeftWidth: 3,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeIconText: { fontSize: 13, fontWeight: '900' },
  cardMid: { flex: 1, gap: 3 },
  cardTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '900' },
  cardSub: { color: '#64748b', fontSize: 12 },
  cardArrow: { fontSize: 12, fontWeight: '900' },
  analysis: { marginTop: 14, gap: 10 },
  analysisSummary: { color: '#cbd5e1', fontSize: 14, lineHeight: 20 },
  analysisSection: { gap: 3 },
  analysisSectionLabel: { fontSize: 11, fontWeight: '900' },
  analysisItem: { color: '#94a3b8', fontSize: 13, lineHeight: 19 },
  analysisKeyMoment: { color: '#64748b', fontSize: 12, fontStyle: 'italic' },
  transcriptCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    padding: 10,
    gap: 5,
  },
  transcriptLabel: { color: '#64748b', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  transcriptText: { color: '#cbd5e1', fontSize: 12, lineHeight: 17 },
  transcriptActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  transcriptAction: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  transcriptActionText: { color: '#e2e8f0', fontSize: 11, fontWeight: '800' },
  searchHighlight: {
    color: '#f8fafc',
    backgroundColor: 'rgba(129,140,248,0.25)',
  },
  followRow: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  followTiming: { fontSize: 11, fontWeight: '900' },
  followText: { color: '#cbd5e1', fontSize: 13, lineHeight: 18 },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cardActionBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  cardActionText: { color: '#e2e8f0', fontSize: 12, fontWeight: '900' },
});
