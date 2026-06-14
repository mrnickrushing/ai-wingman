import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingScreen } from './src/screens/Onboarding/OnboardingScreen';
import { ConsentScreen } from './src/screens/ConsentScreen';
import { LaunchFlowScreen } from './src/screens/LaunchFlowScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { AccountScreen } from './src/screens/AccountScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { PracticeScreen } from './src/screens/PracticeScreen';
import { PlaybooksScreen } from './src/screens/PlaybooksScreen';
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

type Screen =
  | 'home' | 'account' | 'history' | 'practice' | 'playbooks'
  | 'sales-precall' | 'sales-active' | 'sales-postcall'
  | 'dating-precall' | 'dating-active' | 'dating-postcall'
  | 'networking-precall' | 'networking-active' | 'networking-postcall'
  | 'pitching-precall' | 'pitching-active' | 'pitching-postcall'
  | 'hardconvo-precall' | 'hardconvo-active' | 'hardconvo-postcall';

const ONBOARDED_KEY = 'wingman:onboarded';
// Versioned so the consent gate can be re-shown if the disclosure materially changes.
const CONSENT_KEY = 'wingman:consent:v1';

async function applyAvailableUpdate() {
  if (__DEV__ || !Updates.isEnabled) return;
  try {
    const update = await Updates.checkForUpdateAsync();
    if (!update.isAvailable) return;
    const fetched = await Updates.fetchUpdateAsync();
    if (fetched.isNew) {
      await Updates.reloadAsync();
    }
  } catch (error) {
    console.warn('[wingman] update check failed', error);
  }
}

// Catches render-time errors anywhere in the tree and shows a recoverable
// fallback instead of letting the error bubble to the native fatal handler
// (RCTFatal -> abort), which is what crashed Build 23 at launch. Paired with the
// global JS error handler installed in index.js for errors outside render.
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
          <Text
            style={{
              color: '#f8fafc',
              fontSize: 20,
              fontWeight: '800',
              textAlign: 'center',
              marginBottom: 10,
            }}
          >
            Something went wrong
          </Text>
          <Text
            style={{
              color: '#94a3b8',
              fontSize: 14,
              lineHeight: 20,
              textAlign: 'center',
              marginBottom: 24,
            }}
          >
            The app hit an unexpected error. Tap below to try again.
          </Text>
          <Pressable
            onPress={() => this.setState({ error: null })}
            style={{
              backgroundColor: '#6366f1',
              paddingHorizontal: 24,
              paddingVertical: 14,
              borderRadius: 14,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>
              Try again
            </Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <WingmanApp />
    </ErrorBoundary>
  );
}

function WingmanApp() {
  const [screen, setScreen] = useState<Screen>('home');
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [consented, setConsented] = useState<boolean | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  useNotifications();

  useEffect(() => {
    void applyAvailableUpdate();
  }, []);

  useEffect(() => {
    AsyncStorage.multiGet([ONBOARDED_KEY, CONSENT_KEY])
      .then((entries) => {
        const map = Object.fromEntries(entries) as Record<string, string | null>;
        setOnboarded(map[ONBOARDED_KEY] === 'true');
        setConsented(map[CONSENT_KEY] === 'true');
      })
      .catch(() => {
        setOnboarded(false);
        setConsented(false);
      });
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
        <LaunchFlowScreen
          skipIntro
          onComplete={() => setUnlocked(true)}
        />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      {screen === 'home' && (
        <HomeScreen
          onSelectMode={openMode}
          onOpenAccount={() => setScreen('account')}
          onOpenHistory={() => setScreen('history')}
          onOpenPractice={() => setScreen('practice')}
          onOpenPlaybooks={() => setScreen('playbooks')}
        />
      )}

      {screen === 'account' && (
        <AccountScreen
          onBack={() => setScreen('home')}
          onSignedOut={() => {
            setScreen('home');
            setUnlocked(false);
          }}
        />
      )}

      {screen === 'history' && (
        <HistoryScreen
          onBack={() => setScreen('home')}
          onStartMode={openMode}
        />
      )}

      {screen === 'practice' && (
        <PracticeScreen
          onBack={() => setScreen('home')}
          onStartMode={openMode}
        />
      )}

      {screen === 'playbooks' && (
        <PlaybooksScreen
          onBack={() => setScreen('home')}
          onStartMode={openMode}
        />
      )}

      {/* Sales Mode */}
      {screen === 'sales-precall' && (
        <PreCallScreen
          onStart={() => setScreen('sales-active')}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'sales-active' && (
        <ActiveCallScreen onEnd={() => setScreen('sales-postcall')} />
      )}
      {screen === 'sales-postcall' && (
        <PostCallScreen
          onDone={() => setScreen('home')}
          onCallAgain={() => setScreen('sales-active')}
        />
      )}

      {/* Dating Mode */}
      {screen === 'dating-precall' && (
        <PreDatingScreen
          onStart={() => setScreen('dating-active')}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'dating-active' && (
        <ActiveDatingScreen onEnd={() => setScreen('dating-postcall')} />
      )}
      {screen === 'dating-postcall' && (
        <PostDatingScreen
          onHome={() => setScreen('home')}
          onNewSession={() => setScreen('dating-active')}
        />
      )}

      {/* Networking Mode */}
      {screen === 'networking-precall' && (
        <PreNetworkingScreen
          onStart={() => setScreen('networking-active')}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'networking-active' && (
        <ActiveNetworkingScreen onEnd={() => setScreen('networking-postcall')} />
      )}
      {screen === 'networking-postcall' && (
        <PostNetworkingScreen
          onHome={() => setScreen('home')}
          onNewSession={() => setScreen('networking-active')}
        />
      )}

      {/* Pitching Mode */}
      {screen === 'pitching-precall' && (
        <PrePitchingScreen
          onStart={() => setScreen('pitching-active')}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'pitching-active' && (
        <ActivePitchingScreen onEnd={() => setScreen('pitching-postcall')} />
      )}
      {screen === 'pitching-postcall' && (
        <PostPitchingScreen
          onHome={() => setScreen('home')}
          onNewSession={() => setScreen('pitching-active')}
        />
      )}

      {/* Hard Conversations Mode */}
      {screen === 'hardconvo-precall' && (
        <PreHardConversationScreen
          onStart={() => setScreen('hardconvo-active')}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'hardconvo-active' && (
        <ActiveHardConversationScreen onEnd={() => setScreen('hardconvo-postcall')} />
      )}
      {screen === 'hardconvo-postcall' && (
        <PostHardConversationScreen
          onHome={() => setScreen('home')}
          onNewSession={() => setScreen('hardconvo-active')}
        />
      )}
    </>
  );
}
