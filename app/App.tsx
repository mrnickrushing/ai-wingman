import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import * as Sentry from '@sentry/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingScreen } from './src/screens/Onboarding/OnboardingScreen';
import { ConsentScreen } from './src/screens/ConsentScreen';
import { LaunchFlowScreen } from './src/screens/LaunchFlowScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { BriefsScreen } from './src/screens/BriefsScreen';
import { AccountScreen } from './src/screens/AccountScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { PracticeScreen } from './src/screens/PracticeScreen';
import { RoleplayScreen } from './src/screens/RoleplayScreen';
import { PlaybooksScreen } from './src/screens/PlaybooksScreen';
import { TextCoachScreen } from './src/screens/TextCoachScreen';
import { useNotifications } from './src/hooks/useNotifications';
import { PreCallScreen } from './src/screens/SalesMode/PreCallScreen';
import { ActiveCallScreen } from './src/screens/SalesMode/ActiveCallScreen';
import { PostCallScreen } from './src/screens/SalesMode/PostCallScreen';
import { PreDatingScreen } from './src/screens/DatingMode/PreDatingScreen';
import { ActiveDatingScreen } from './src/screens/DatingMode/ActiveDatingScreen';
import { PostDatingScreen } from './src/screens/DatingMode/PostDatingScreen';
import { PreNetworkingScreen } from './src/screens/NetworkingMode/PreNetworkingScreen';
import { ActiveNetworkingScreen } from './src/screens/NetworkingMode/ActiveNetworkingScreen';
import { PostNetworkingScreen } from './src/screens/NetworkingMode/PostNetworkingScreen';
import { PrePitchingScreen } from './src/screens/PitchingMode/PrePitchingScreen';
import { ActivePitchingScreen } from './src/screens/PitchingMode/ActivePitchingScreen';
import { PostPitchingScreen } from './src/screens/PitchingMode/PostPitchingScreen';
import { PreHardConversationScreen } from './src/screens/HardConversationsMode/PreHardConversationScreen';
import { ActiveHardConversationScreen } from './src/screens/HardConversationsMode/ActiveHardConversationScreen';
import { PostHardConversationScreen } from './src/screens/HardConversationsMode/PostHardConversationScreen';
import { ConversationMode } from './src/types';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    enabled: !__DEV__,
    tracesSampleRate: 0.2,
  });
}

type Screen =
  | 'home' | 'account' | 'history' | 'practice' | 'playbooks' | 'briefs'
  | 'roleplay'
  | 'messages'
  | 'sales-precall' | 'sales-active' | 'sales-postcall'
  | 'dating-precall' | 'dating-active' | 'dating-postcall'
  | 'networking-precall' | 'networking-active' | 'networking-postcall'
  | 'pitching-precall' | 'pitching-active' | 'pitching-postcall'
  | 'hardconvo-precall' | 'hardconvo-active' | 'hardconvo-postcall';

const ONBOARDED_KEY = 'wingman:onboarded';
const CONSENT_KEY = 'wingman:consent:v1';

async function applyAvailableUpdate() {
  if (__DEV__ || !Updates.isEnabled) return;
  try {
    const update = await Updates.checkForUpdateAsync();
    if (!update.isAvailable) return;
    const fetched = await Updates.fetchUpdateAsync();
    if (fetched.isNew) await Updates.reloadAsync();
  } catch (error) {
    console.warn('[wingman] update check failed', error);
  }
}

// ─── Animated screen wrapper ───────────────────────────────────────────────
// Every time `screen` changes, this component re-mounts (via the key prop in
// WingmanApp) and runs a 280ms fade + 18px upward slide so every transition
// feels snappy and intentional.
function AnimatedScreen({ children }: { children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.View style={{ flex: 1, opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[wingman] ErrorBoundary caught render error', error);
    if (SENTRY_DSN) Sentry.captureException(error);
  }

  render() {
    if (this.state.error) {
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: '#050510',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <StatusBar style="light" />
          <Text style={{ color: '#f8fafc', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 10 }}>
            Something went wrong
          </Text>
          <Text style={{ color: '#94a3b8', fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 24 }}>
            The app hit an unexpected error. Tap below to try again.
          </Text>
          <Pressable
            onPress={() => this.setState({ error: null })}
            style={{ backgroundColor: '#6366f1', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 }}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <WingmanApp />
    </ErrorBoundary>
  );
}

export default SENTRY_DSN ? Sentry.wrap(App) : App;

function WingmanApp() {
  const [screen, setScreen] = useState<Screen>('home');
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [consented, setConsented] = useState<boolean | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [roleplayMode, setRoleplayMode] = useState<ConversationMode>('sales');
  useNotifications();

  useEffect(() => { void applyAvailableUpdate(); }, []);

  useEffect(() => {
    AsyncStorage.getMany([ONBOARDED_KEY, CONSENT_KEY])
      .then((map) => {
        setOnboarded(map[ONBOARDED_KEY] === 'true');
        setConsented(map[CONSENT_KEY] === 'true');
      })
      .catch(() => { setOnboarded(false); setConsented(false); });
  }, []);

  const completeOnboarding = () => {
    setOnboarded(true);
    AsyncStorage.setItem(ONBOARDED_KEY, 'true').catch(() => {});
  };

  const completeConsent = () => {
    setConsented(true);
    AsyncStorage.setItem(CONSENT_KEY, 'true').catch(() => {});
  };

  const openMode = (mode: string) => {
    if (mode === 'sales') setScreen('sales-precall');
    else if (mode === 'dating') setScreen('dating-precall');
    else if (mode === 'networking') setScreen('networking-precall');
    else if (mode === 'pitching') setScreen('pitching-precall');
    else if (mode === 'hard_conversations') setScreen('hardconvo-precall');
  };

  if (onboarded === null || consented === null) {
    return (
      <>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: '#050510' }} />
      </>
    );
  }

  if (!onboarded) {
    return (
      <>
        <StatusBar style="light" />
        <OnboardingScreen onComplete={completeOnboarding} />
      </>
    );
  }

  if (!consented) {
    return (
      <>
        <StatusBar style="light" />
        <ConsentScreen onAgree={completeConsent} />
      </>
    );
  }

  if (!unlocked) {
    return (
      <>
        <StatusBar style="light" />
        <LaunchFlowScreen skipIntro onComplete={() => setUnlocked(true)} />
      </>
    );
  }

  // The `key={screen}` on AnimatedScreen forces a re-mount (and fresh animation)
  // on every screen change.
  return (
    <>
      <StatusBar style="light" />
      <View style={shellStyles.root}>
        <View style={shellStyles.content}>
          <AnimatedScreen key={screen}>
            {screen === 'home' && (
              <HomeScreen
                onSelectMode={openMode}
                onOpenBriefs={() => setScreen('briefs')}
                onOpenAccount={() => setScreen('account')}
                onOpenHistory={() => setScreen('history')}
                onOpenPractice={() => setScreen('practice')}
                onOpenMessages={() => setScreen('messages')}
              />
            )}

            {screen === 'briefs' && (
              <BriefsScreen onBack={() => setScreen('home')} onStartMode={openMode} />
            )}

            {screen === 'account' && (
              <AccountScreen
                onBack={() => setScreen('home')}
                onSignedOut={() => { setScreen('home'); setUnlocked(false); }}
              />
            )}

            {screen === 'history' && (
              <HistoryScreen onBack={() => setScreen('home')} onStartMode={openMode} />
            )}

            {screen === 'practice' && (
              <PracticeScreen
                onBack={() => setScreen('home')}
                onStartMode={openMode}
                onStartRoleplay={(mode) => { setRoleplayMode(mode); setScreen('roleplay'); }}
              />
            )}

            {screen === 'roleplay' && (
              <RoleplayScreen onBack={() => setScreen('practice')} mode={roleplayMode} />
            )}

            {screen === 'playbooks' && (
              <PlaybooksScreen onBack={() => setScreen('home')} onStartMode={openMode} />
            )}

            {screen === 'messages' && (
              <TextCoachScreen onBack={() => setScreen('home')} />
            )}

            {/* Sales Mode */}
            {screen === 'sales-precall' && (
              <PreCallScreen onStart={() => setScreen('sales-active')} onBack={() => setScreen('home')} />
            )}
            {screen === 'sales-active' && (
              <ActiveCallScreen onEnd={() => setScreen('sales-postcall')} />
            )}
            {screen === 'sales-postcall' && (
              <PostCallScreen onDone={() => setScreen('home')} onCallAgain={() => setScreen('sales-active')} />
            )}

            {/* Dating Mode */}
            {screen === 'dating-precall' && (
              <PreDatingScreen onStart={() => setScreen('dating-active')} onBack={() => setScreen('home')} />
            )}
            {screen === 'dating-active' && (
              <ActiveDatingScreen onEnd={() => setScreen('dating-postcall')} />
            )}
            {screen === 'dating-postcall' && (
              <PostDatingScreen onHome={() => setScreen('home')} onNewSession={() => setScreen('dating-active')} />
            )}

            {/* Networking Mode */}
            {screen === 'networking-precall' && (
              <PreNetworkingScreen onStart={() => setScreen('networking-active')} onBack={() => setScreen('home')} />
            )}
            {screen === 'networking-active' && (
              <ActiveNetworkingScreen onEnd={() => setScreen('networking-postcall')} />
            )}
            {screen === 'networking-postcall' && (
              <PostNetworkingScreen onHome={() => setScreen('home')} onNewSession={() => setScreen('networking-active')} />
            )}

            {/* Pitching Mode */}
            {screen === 'pitching-precall' && (
              <PrePitchingScreen onStart={() => setScreen('pitching-active')} onBack={() => setScreen('home')} />
            )}
            {screen === 'pitching-active' && (
              <ActivePitchingScreen onEnd={() => setScreen('pitching-postcall')} />
            )}
            {screen === 'pitching-postcall' && (
              <PostPitchingScreen onHome={() => setScreen('home')} onNewSession={() => setScreen('pitching-active')} />
            )}

            {/* Hard Conversations Mode */}
            {screen === 'hardconvo-precall' && (
              <PreHardConversationScreen onStart={() => setScreen('hardconvo-active')} onBack={() => setScreen('home')} />
            )}
            {screen === 'hardconvo-active' && (
              <ActiveHardConversationScreen onEnd={() => setScreen('hardconvo-postcall')} />
            )}
            {screen === 'hardconvo-postcall' && (
              <PostHardConversationScreen onHome={() => setScreen('home')} onNewSession={() => setScreen('hardconvo-active')} />
            )}
          </AnimatedScreen>
        </View>

        {shouldShowDock(screen) ? (
          <BottomNav
            current={screen}
            onGoHome={() => setScreen('home')}
            onOpenBriefs={() => setScreen('briefs')}
            onOpenPractice={() => setScreen('practice')}
            onOpenHistory={() => setScreen('history')}
            onOpenPlaybooks={() => setScreen('playbooks')}
            onOpenMessages={() => setScreen('messages')}
            bottomInset={16}
          />
        ) : null}
      </View>
    </>
  );
}

function shouldShowDock(_screen: Screen) {
  return true;
}

type NavItem = {
  readonly key: Screen;
  readonly label: string;
  readonly icon: string;
  readonly onPress: () => void;
};

// ─── Pulsing glow badge for active nav icon ────────────────────────────────
function PulseGlow() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.55, duration: 900, easing: Easing.out(Easing.sin), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 900, easing: Easing.out(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.55, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [scale, opacity]);

  return (
    <Animated.View
      style={[
        navStyles.pulseRing,
        { transform: [{ scale }], opacity },
      ]}
    />
  );
}

function BottomNav({
  current,
  onGoHome,
  onOpenBriefs,
  onOpenPractice,
  onOpenHistory,
  onOpenPlaybooks,
  onOpenMessages,
  bottomInset,
}: {
  current: Screen;
  onGoHome: () => void;
  onOpenBriefs: () => void;
  onOpenPractice: () => void;
  onOpenHistory: () => void;
  onOpenPlaybooks: () => void;
  onOpenMessages: () => void;
  bottomInset: number;
}) {
  const items: readonly NavItem[] = [
    { key: 'home',      label: 'Home',     icon: '⌂', onPress: onGoHome },
    { key: 'briefs',    label: 'Briefs',   icon: '≋', onPress: onOpenBriefs },
    { key: 'practice',  label: 'Practice', icon: '▷', onPress: onOpenPractice },
    { key: 'history',   label: 'History',  icon: '◷', onPress: onOpenHistory },
    { key: 'playbooks', label: 'Books',    icon: '▣', onPress: onOpenPlaybooks },
    { key: 'messages',  label: 'Text',     icon: '✉', onPress: onOpenMessages },
  ] as const;

  return (
    <View style={[navStyles.shell, { bottom: Math.max(6, bottomInset) }]}>
      <View style={navStyles.bar}>
        {items.map((item) => {
          const active = current === item.key;
          return (
            <Pressable key={item.key} onPress={item.onPress} style={navStyles.item}>
              {active ? <View style={navStyles.activeIndicator} /> : null}
              <View style={navStyles.iconWrap}>
                {/* Pulsing ambient glow ring behind active icon */}
                {active ? <PulseGlow /> : null}
                <View style={[navStyles.iconBadge, active && navStyles.iconBadgeActive]}>
                  <Text style={[navStyles.icon, active && navStyles.iconActive]}>{item.icon}</Text>
                </View>
              </View>
              <Text style={[navStyles.label, active && navStyles.labelActive]} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const navStyles = StyleSheet.create({
  shell: {
    position: 'absolute',
    left: 12,
    right: 12,
    paddingTop: 10,
    zIndex: 30,
  },
  bar: {
    flexDirection: 'row',
    gap: 2,
    backgroundColor: 'rgba(6, 6, 16, 0.97)',
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.22)',
    borderRadius: 26,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 10,
    // Stronger ambient glow under the whole bar
    shadowColor: '#6366f1',
    shadowOpacity: 0.32,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 8 },
    elevation: 28,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 20,
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    left: '25%',
    right: '25%',
    height: 2.5,
    borderRadius: 999,
    backgroundColor: '#818cf8',
    // Glow on the active indicator line
    shadowColor: '#818cf8',
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  // Wrapper needed so the pulse ring doesn't clip the badge
  iconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Pulsing translucent ring that expands outward
  pulseRing: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(99,102,241,0.38)',
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeActive: {
    backgroundColor: 'rgba(99,102,241,0.22)',
    // Tight glow on the active icon badge itself
    shadowColor: '#818cf8',
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  icon: { color: '#64748b', fontSize: 17, fontWeight: '900' },
  iconActive: { color: '#c7d2fe' },
  label: { color: '#64748b', fontSize: 10, fontWeight: '700' },
  labelActive: { color: '#c7d2fe', fontWeight: '900' },
});

const shellStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050510', position: 'relative' },
  content: { flex: 1 },
});
