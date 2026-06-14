import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  Alert,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { loadLaunchSnapshot, signOut, resetLaunchState, type LaunchSnapshot } from '../services/auth';
import { checkWingmanServerHealth, getWingmanServerUrl } from '../services/wingmanClient';
import { useSessionStore } from '../store/sessionStore';

const PROVIDER_LABEL: Record<string, string> = {
  email: 'Email & Password',
  apple: 'Apple Sign In',
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
  const [health, setHealth] = useState<{ label: string; detail: string; color: string }>({
    label: 'Unknown',
    detail: 'Tap check to verify the backend.',
    color: '#64748b',
  });
  const { sessionPhase, serverHealth, lastTranscriptAt, lastAudioChunkAt, lastErrorAt } = useSessionStore();

  useEffect(() => {
    loadLaunchSnapshot().then((s) => {
      setSnapshot(s);
      setLoading(false);
    });
  }, []);

  const refreshHealth = async () => {
    const result = await checkWingmanServerHealth();
    setHealth({
      label: result.ok ? 'Online' : 'Offline',
      detail: result.message || `HTTP ${result.status || '—'}`,
      color: result.ok ? '#4ade80' : '#f43f5e',
    });
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
      'Delete Account',
      'This permanently removes your account and all local data. This cannot be undone.',
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

  const account = snapshot?.account ?? null;
  const initials = account?.displayName
    ? account.displayName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <View style={s.root}>
      <LinearGradient colors={['#0c0c22', '#050510']} style={StyleSheet.absoluteFill} />
      <View style={s.orb} />

      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <Pressable onPress={onBack} style={s.backBtn} hitSlop={12}>
            <Text style={s.backArrow}>←</Text>
            <Text style={s.backLabel}>Home</Text>
          </Pressable>
          <Text style={s.title}>Account</Text>
          <View style={s.backBtn} />
        </View>

        {loading ? (
          <View style={s.center}>
            <ActivityIndicator color="#6366f1" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={s.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Avatar + identity */}
            <View style={s.avatarWrap}>
              <LinearGradient colors={['#6366f1', '#8b5cf6']} style={s.avatar}>
                <Text style={s.avatarText}>{initials}</Text>
              </LinearGradient>
              <Text style={s.displayName}>{account?.displayName ?? 'Guest'}</Text>
              <Text style={s.email}>{account?.email ?? 'No account'}</Text>
            </View>

            {/* Account details card */}
            <View style={s.card}>
              <Row label="Sign-in method" value={PROVIDER_LABEL[account?.provider ?? ''] ?? '—'} />
              <Divider />
              <Row
                label="Membership"
                value={account?.premium ? 'Active' : 'Free'}
                valueColor={account?.premium ? '#4ade80' : '#f59e0b'}
              />
              <Divider />
              <Row
                label="Member since"
                value={account?.createdAt
                  ? new Date(account.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  : '—'}
              />
            </View>

            <View style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.cardTitle}>Diagnostics</Text>
                <TouchableOpacity onPress={refreshHealth} style={s.smallBtn}>
                  <Text style={s.smallBtnText}>Check</Text>
                </TouchableOpacity>
              </View>
              <Row label="Backend" value={health.label} valueColor={health.color} />
              <Divider />
              <Row label="Server URL" value={getWingmanServerUrl()} />
              <Divider />
              <Row label="Session phase" value={sessionPhase} />
              <Divider />
              <Row label="Server state" value={serverHealth} />
              <Divider />
              <Row label="Last transcript" value={lastTranscriptAt ? new Date(lastTranscriptAt).toLocaleTimeString() : '—'} />
              <Divider />
              <Row label="Last audio" value={lastAudioChunkAt ? new Date(lastAudioChunkAt).toLocaleTimeString() : '—'} />
              <Divider />
              <Row label="Last error" value={lastErrorAt ? new Date(lastErrorAt).toLocaleTimeString() : '—'} />
              <Text style={s.diagnosticsNote} numberOfLines={2}>{health.detail}</Text>
            </View>

            {/* Actions */}
            <View style={s.actionsCard}>
              <Pressable
                style={[s.actionRow, actionLoading === 'signout' && s.actionRowDisabled]}
                onPress={handleSignOut}
                disabled={Boolean(actionLoading)}
              >
                {actionLoading === 'signout' ? (
                  <ActivityIndicator color="#6366f1" size="small" />
                ) : (
                  <Text style={s.actionLabel}>Sign out</Text>
                )}
                <Text style={s.actionArrow}>→</Text>
              </Pressable>

              <Divider />

              <Pressable
                style={[s.actionRow, actionLoading === 'delete' && s.actionRowDisabled]}
                onPress={handleDeleteAccount}
                disabled={Boolean(actionLoading)}
              >
                {actionLoading === 'delete' ? (
                  <ActivityIndicator color="#f43f5e" size="small" />
                ) : (
                  <Text style={[s.actionLabel, s.actionLabelDanger]}>Delete account</Text>
                )}
                <Text style={[s.actionArrow, s.actionArrowDanger]}>→</Text>
              </Pressable>
            </View>

            <Text style={s.dataNote}>
              Your account is stored locally on this device. Signing out or deleting removes it from this device only.
            </Text>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

function Row({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={s.divider} />;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050510' },
  safe: { flex: 1 },
  orb: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    top: -100, right: -80, backgroundColor: 'rgba(99,102,241,0.07)',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16,
  },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 60,
  },
  backArrow: { color: '#6366f1', fontSize: 18, fontWeight: '700' },
  backLabel: { color: '#6366f1', fontSize: 15, fontWeight: '600' },
  title: { color: '#f1f5f9', fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  content: { paddingHorizontal: 20, paddingBottom: 48, gap: 16 },
  avatarWrap: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '800' },
  displayName: { color: '#f1f5f9', fontSize: 20, fontWeight: '700', letterSpacing: -0.4 },
  email: { color: '#64748b', fontSize: 14 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10,
  },
  cardTitle: { color: '#f1f5f9', fontSize: 14, fontWeight: '800' },
  smallBtn: {
    backgroundColor: 'rgba(99,102,241,0.14)',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.26)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  smallBtnText: { color: '#c4b5fd', fontSize: 11, fontWeight: '800' },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 15,
  },
  rowLabel: { color: '#64748b', fontSize: 14 },
  rowValue: { color: '#f1f5f9', fontSize: 14, fontWeight: '600' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 18 },
  actionsCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 16,
  },
  actionRowDisabled: { opacity: 0.5 },
  actionLabel: { color: '#f1f5f9', fontSize: 15, fontWeight: '500' },
  actionLabelDanger: { color: '#f43f5e' },
  actionArrow: { color: '#334155', fontSize: 16 },
  actionArrowDanger: { color: '#f43f5e66' },
  dataNote: {
    color: '#334155', fontSize: 12, textAlign: 'center', lineHeight: 18,
    paddingHorizontal: 8,
  },
  diagnosticsNote: {
    color: '#64748b', fontSize: 12, paddingHorizontal: 18, paddingBottom: 14,
    paddingTop: 2, lineHeight: 18,
  },
});
