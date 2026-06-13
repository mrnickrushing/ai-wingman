import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { HomeScreen } from './src/screens/HomeScreen';
import { PreCallScreen } from './src/screens/SalesMode/PreCallScreen';
import { ActiveCallScreen } from './src/screens/SalesMode/ActiveCallScreen';
import { PostCallScreen } from './src/screens/SalesMode/PostCallScreen';

type Screen = 'home' | 'sales-precall' | 'sales-active' | 'sales-postcall';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');

  return (
    <>
      <StatusBar style="light" />
      {screen === 'home' && (
        <HomeScreen onSelectMode={(mode) => {
          if (mode === 'sales') setScreen('sales-precall');
        }} />
      )}
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
    </>
  );
}
