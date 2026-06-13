import { registerRootComponent } from 'expo';
import App from './App';

// Classic (non-expo-router) entry: register the root App component so the
// hand-built navigation in App.tsx actually mounts.
registerRootComponent(App);
