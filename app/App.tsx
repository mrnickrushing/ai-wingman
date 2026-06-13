import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { HomeScreen } from './src/screens/HomeScreen';
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

type Screen =
  | 'home'
  | 'sales-precall' | 'sales-active' | 'sales-postcall'
  | 'dating-precall' | 'dating-active' | 'dating-postcall'
  | 'networking-precall' | 'networking-active' | 'networking-postcall'
  | 'pitching-precall' | 'pitching-active' | 'pitching-postcall';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');

  return (
    <>
      <StatusBar style="light" />
      {screen === 'home' && (
        <HomeScreen onSelectMode={(mode) => {
          if (mode === 'sales') setScreen('sales-precall');
          else if (mode === 'dating') setScreen('dating-precall');
          else if (mode === 'networking') setScreen('networking-precall');
          else if (mode === 'pitching') setScreen('pitching-precall');
        }} />
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
    </>
  );
}
