import React, { useState } from 'react';
import { HomeScreen } from './src/screens/HomeScreen';
import { PreCallScreen } from './src/screens/SalesMode/PreCallScreen';
import { ActiveCallScreen } from './src/screens/SalesMode/ActiveCallScreen';

type Screen = 'home' | 'sales-precall' | 'sales-active';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');

  if (screen === 'home') {
    return (
      <HomeScreen
        onSelectMode={(mode) => {
          if (mode === 'sales') setScreen('sales-precall');
        }}
      />
    );
  }

  if (screen === 'sales-precall') {
    return (
      <PreCallScreen
        onStart={() => setScreen('sales-active')}
        onBack={() => setScreen('home')}
      />
    );
  }

  if (screen === 'sales-active') {
    return (
      <ActiveCallScreen
        onEnd={() => setScreen('home')}
      />
    );
  }

  return null;
}
