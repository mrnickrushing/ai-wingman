import { useShallow } from 'zustand/react/shallow';
import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet, SafeAreaView,
  Alert, ScrollView, ActivityIndicator, TouchableOpacity, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { loadLaunchSnapshot, signOut, resetLaunchState, type LaunchSnapshot } from '../services/auth';
import { checkWingmanServerHealth, getWingmanServerUrl } from '../services/wingmanClient';
import { manageMembership, restoreMembership } from '../services/purchases';
import { runWingmanPreflight } from '../hooks/useWingmanSession';
import { useSessionStore } from '../store/sessionStore';
import { LEGAL_CONSENT_VERSION } from '../services/legalConsent';

const TERMS_URL = 'https://aiwingman.rushingtechnologies.com/terms';
const PRIVACY_URL = 'https://aiwingman.rushingtechnologies.com/privacy';

const PROVIDER_LABEL: Record<string, string> = {
  email: 'Email',
  apple: 'Apple',
  google: 'Google',
};

type Props = {
  onBack: () => void;
  onSignedOut: () => void;
};

export function AccountScreen({ onBack, onSignedOut }: Props) {
  const [snapshot, setSnapshot] = useState<LaunchSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [audioCheck, setAudioCheck] = useState<string>('Not checked');
  const [health, setHealth] = useState<{ label: string; detail: string; color: string }>({
    label: 'Unknown',
    detail: 'Tap check to verify the backend.',
    color: '#64748b',
  });
  const { sessionPhase, serverHealth, lastTranscriptAt, lastAudioChunkAt, lastErrorAt } = useSessionStore(
  useShallow((state) => ({
    sessionPhase: state.sessionPhase,
    serverHealth: state.serverHealth,
    lastTranscriptAt: state.lastTranscriptAt,
    lastAudioChunkAt: state.lastAudioChunkAt,
    lastErrorAt: state.lastErrorAt,
  }))
);

  useEffect(() => {
    loadLaunchSnapshot().then((s) => {
      setSnapshot(s);
      setLoading(false);
    });
  }, []);

  const refreshHealth = async () => {
    useSessionStore.getState().setServerHealth('checking');
    const result = await checkWingmanServerHealth();
    setHealth({
      label: result.ok ? 'Online' : 'Offline',
      detail: result.message || `HTTP ${result.status || '-'}`,
      color: result.ok ? '#4ade80' : '#f43f5e',
    });
    useSessionStore.getState().setServerHealth(result.ok ? 'online' : 'offline');
  };

  useEffect(() => {
    void refreshHealth();
  }, []);

  const handleSignOut = async () => {
    setActionLoading('signout');
    try {
      await signOut();
      onSignedOut();
    } catch {
      Alert.alert('Error', 'Could not sign out. Please try again.');
      setActionLoading(null);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This removes the account from this device and clears local app state.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading('delete');
            try {
              await resetLaunchState();
              onSignedOut();
            } catch {
              Alert.alert('Error', 'Could not delete account. Please try again.');
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleRestorePurchase = async () => {
    setActionLoading('restore');
    try {
      await restoreMembership(account);
      Alert.alert('Membership restored', 'Your active membership was found.');
    } catch (err) {
      Alert.alert('Restore failed', err instanceof Error ? err.message : 'Could not restore membership.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setActionLoading('manage');
    try {
      await manageMembership(account);
    } catch (err) {
      Alert.alert('Subscription', err instanceof Error ? err.message : 'Could not open subscription management.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAudioCheck = async () => {
    setActionLoading('audio');
    setAudioCheck('Listening...');
    try {
      const result = await runWingmanPreflight();
      setAudioCheck(result.ok ? 'Ready' : result.input.message || result.recorder.message || result.server.message);
    } catch (err) {
      setAudioCheck(err instanceof Error ? err.message : 'Audio check failed.');
    } finally {
      setActionLoading(null);
    }
  };

  const account = snapshot?.account ?? null;
  const initials = account?.displayName
    ? account.displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'W';

  return (
    <View style={s.root}>
      <LinearGradient colors={['#090914', '#050510']} style={StyleSheet.absoluteFill} />
      {/* Ambient glow behind profile area */}
      <View style={s.bgGlow} pointerEvents="none" />

      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Pressable onPress={onBack} style={s.backBtn} hitSlop={12}>
            <Text style={s.backText}>‹ Back</Text>
          </Pressable>
          <Text style={s.title}>Account</Text>
          <View style={s.headerSpacer} />
        </View>

        {loading ? (
          <View style={s.center}>
            <ActivityIndicator color="#6366f1" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
            {/* Profile band */}
            <View style={s.profileBand}>
              <View style={s.avatarGlowWrap}>
                <LinearGradient colors={['#6366f1', '#8b5cf6']} style={s.avatar}>
                  <Text style={s.avatarText}>{initials}</Text>
                </LinearGradient>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.displayName}>{account?.displayName ?? 'Wingman User'}</Text>
                <Text style={s.email} numberOfLines={1}>{account?.email ?? 'No account connected'}</Text>
              </View>
              {account?.premium ? (
                <LinearGradient
                  colors={['rgba(74,222,128,0.22)', 'rgba(74,222,128,0.08)']}
                  style={[s.membershipPill, s.membershipActive]}
                >
                  <Text style={[s.membershipText, s.membershipTextActive]}>⚡ Pro</Text>
                </LinearGradient>
              ) : (
                <View style={[s.membershipPill, s.membershipFree]}>
                  <Text style={[s.membershipText, s.membershipTextFree]}>Free</Text>
                </View>
              )}
            </View>

            {/* Stats mini row */}
            <View style={s.statsRow}>
              <View style={s.statTile}>
                <Text style={s.statValue}>—</Text>
                <Text style={s.statLabel}>Sessions</Text>
              </View>
              <View style={s.statTile}>
                <Text style={s.statValue}>—</Text>
                <Text style={s.statLabel}>Streak</Text>
              </View>
              <View style={s.statTile}>
                <Text style={[s.statValue, account?.premium ? { color: '#4ade80' } : { color: '#f59e0b' }]}>
                  {account?.premium ? 'Pro' : 'Free'}
                </Text>
                <Text style={s.statLabel}>Tier</Text>
              </View>
            </View>

            <SettingsCard title="Account">
              <Row label="Sign-in" value={PROVIDER_LABEL[account?.provider ?? ''] ?? '-'} />
              <Divider />
              <Row
                label="Member since"
                value={account?.createdAt
                  ? new Date(account.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  : '-'}
              />
            </SettingsCard>

            <SettingsCard title="Membership">
              <Row label="Status" value={account?.premium ? 'Pro active' : 'Not active'} valueColor={account?.premium ? '#4ade80' : '#f59e0b'} />
              <Divider />
              <ActionRow label="Restore purchase" loading={actionLoading === 'restore'} disabled={Boolean(actionLoading)} onPress={handleRestorePurchase} />
              <Divider />
              <ActionRow label="Manage subscription" loading={actionLoading === 'manage'} disabled={Boolean(actionLoading)} onPress={handleManageSubscription} />
            </SettingsCard>

            <SettingsCard title="Audio">
              <Row label="Coaching voice" value="Enabled" />
              <Divider />
              <Row label="Session checks" value="Before every call" />
              <Divider />
              <Row label="Ready check" value={audioCheck} />
              <Divider />
              <ActionRow label="Test mic and server" loading={actionLoading === 'audio'} disabled={Boolean(actionLoading)} onPress={handleAudioCheck} />
              <Divider />
              <Row label="Transcript storage" value="Session recaps only" />
            </SettingsCard>

            <SettingsCard title="Privacy">
              <Row label="Raw audio" value="Discarded after processing" valueColor="#4ade80" />
              <Divider />
              <Row label="Transcripts & recaps" value="Saved up to 90 days" />
            </SettingsCard>

            <SettingsCard title="Legal & consent">
              <Row label="Agreement version" value={LEGAL_CONSENT_VERSION} />
              <Divider />
              <ActionRow label="Terms of Service" loading={false} disabled={false} onPress={() => { void Linking.openURL(TERMS_URL); }} />
              <Divider />
              <ActionRow label="Privacy Policy" loading={false} disabled={false} onPress={() => { void Linking.openURL(PRIVACY_URL); }} />
            </SettingsCard>

            <View style={s.card}>
              <TouchableOpacity
                onPress={() => setShowDiagnostics((v) => !v)}
                style={s.cardHeaderButton}
                activeOpacity={0.8}
              >
                <Text style={s.cardTitle}>Troubleshooting</Text>
                <Text style={s.toggleText}>{showDiagnostics ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
              {showDiagnostics ? (
                <View>
                  <Divider />
                  <View style={s.cardHeader}>
                    <Text style={s.subtleTitle}>Diagnostics</Text>
                    <TouchableOpacity onPress={refreshHealth} style={s.smallBtn}>
                      <Text style={s.smallBtnText}>Check</Text>
                    </TouchableOpacity>
                  </View>
                  <Row label="Backend" value={health.label} valueColor={health.color} />
                  <Divider />
                  <Row label="Server state" value={serverHealth === 'unknown' ? 'idle' : serverHealth} />
                  <Divider />
                  <Row label="Session phase" value={sessionPhase} />
                  <Divider />
                  <Row label="Last transcript" value={lastTranscriptAt ? new Date(lastTranscriptAt).toLocaleTimeString() : '-'} />
                  <Divider />
                  <Row label="Last audio" value={lastAudioChunkAt ? new Date(lastAudioChunkAt).toLocaleTimeString() : '-'} />
                  <Divider />
                  <Row label="Last error" value={lastErrorAt ? new Date(lastErrorAt).toLocaleTimeString() : '-'} />
                  <Text style={s.diagnosticsNote} numberOfLines={3}>
                    {getWingmanServerUrl()} · {health.detail}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={s.card}>
              <View style={s.signOutBorder}>
                <ActionRow label="Sign out" loading={actionLoading === 'signout'} disabled={Boolean(actionLoading)} onPress={handleSignOut} />
              </View>
              <Divider />
              <View style={s.deleteBorder}>
                <ActionRow label="Delete account" danger loading={actionLoading === 'delete'} disabled={Boolean(actionLoading)} onPress={handleDeleteAccount} />
              </View>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{title}</Text>
      <View style={s.cardBody}>{children}</View>
    </View>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, valueColor ? { color: valueColor } : undefined]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function ActionRow({
  label,
  danger,
  loading,
  disabled,
  onPress,
}: {
  label: string;
  danger?: boolean;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[s.actionRow, disabled && s.disabled]} onPress={onPress} disabled={disabled}>
      {loading ? (
        <ActivityIndicator color={danger ? '#f43f5e' : '#6366f1'} size="small" />
      ) : (
        <Text style={[s.actionLabel, danger && s.actionDanger]}>{label}</Text>
      )}
      <Text style={[s.actionArrow, danger && s.actionDanger]}>›</Text>
    </Pressable>
  );
}

function Divider() {
  return <View style={s.divider} />;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050510' },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bgGlow: {
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    top: 60, alignSelf: 'center', backgroundColor: 'rgba(99,102,241,0.12)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: { minWidth: 64 },
  backText: { color: '#a5b4fc', fontSize: 15, fontWeight: '800' },
  title: { color: '#f8fafc', fontSize: 18, fontWeight: '900' },
  headerSpacer: { width: 64 },
  content: { paddingHorizontal: 18, paddingBottom: 116, gap: 14 },
  profileBand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(99,102,241,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.28)',
    borderRadius: 14,
    padding: 16,
  },
  avatarGlowWrap: {
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 18,
    elevation: 14,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(129,140,248,0.5)',
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '900' },
  displayName: { color: '#f8fafc', fontSize: 17, fontWeight: '900' },
  email: { color: '#94a3b8', fontSize: 12, marginTop: 3 },
  membershipPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  membershipActive: { borderColor: 'rgba(74,222,128,0.4)', shadowColor: '#4ade80', shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
  membershipFree: { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.28)' },
  membershipText: { fontSize: 11, fontWeight: '900' },
  membershipTextActive: { color: '#4ade80' },
  membershipTextFree: { color: '#f59e0b' },

  statsRow: { flexDirection: 'row', gap: 10 },
  statTile: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: 'rgba(99,102,241,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.18)',
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { color: '#a5b4fc', fontSize: 18, fontWeight: '900' },
  statLabel: { color: '#64748b', fontSize: 11, fontWeight: '600' },

  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  cardTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '900', padding: 16, paddingBottom: 10 },
  subtleTitle: { color: '#cbd5e1', fontSize: 13, fontWeight: '900' },
  cardBody: { paddingBottom: 4 },
  cardHeaderButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleText: { color: '#818cf8', fontSize: 12, fontWeight: '900', paddingRight: 16 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  smallBtn: {
    backgroundColor: 'rgba(99,102,241,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.26)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  smallBtnText: { color: '#c4b5fd', fontSize: 11, fontWeight: '900' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  rowLabel: { color: '#94a3b8', fontSize: 13 },
  rowValue: { color: '#f8fafc', fontSize: 13, fontWeight: '800', flexShrink: 1 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 16 },
  diagnosticsNote: { color: '#64748b', fontSize: 11, padding: 16, paddingTop: 8, lineHeight: 17 },
  signOutBorder: { borderLeftWidth: 3, borderLeftColor: 'rgba(129,140,248,0.35)' },
  deleteBorder: { borderLeftWidth: 3, borderLeftColor: 'rgba(244,63,94,0.35)' },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  disabled: { opacity: 0.55 },
  actionLabel: { color: '#f8fafc', fontSize: 15, fontWeight: '800' },
  actionDanger: { color: '#f43f5e' },
  actionArrow: { color: '#64748b', fontSize: 24, fontWeight: '500' },
});
