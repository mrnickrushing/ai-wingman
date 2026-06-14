import { registerRootComponent } from 'expo';
import App from './App';

// LAST-RESORT JS CRASH GUARD (installed before anything else mounts).
//
// In production/TestFlight builds, any unhandled JS error is routed through
// React Native's default global handler, which — when `isFatal` — calls
// `RCTFatal` → `abort()`. That is exactly the Build-23 signature: EXC_CRASH /
// SIGABRT on `com.meta.react.turbomodulemanager.queue` with a
// `RCTGetFatalHandler` → `reportFatal:` → `performVoidMethodInvocation`
// backtrace, ~960ms in, before any screen renders. A single throw on the
// TurboModule queue (e.g. a misconfigured native module call during the first
// render/effect pass) takes the whole app down.
//
// We chain our handler in front of RN's default so we keep logging, but we
// NEVER forward fatal errors to the default handler — that breaks the
// escalation to native abort and keeps the app alive (the React error boundary
// in App.tsx renders a fallback for render-time errors). Non-fatal errors are
// still passed through to preserve normal LogBox/dev behavior.
const defaultGlobalHandler =
  typeof ErrorUtils !== 'undefined' && ErrorUtils.getGlobalHandler
    ? ErrorUtils.getGlobalHandler()
    : null;

if (typeof ErrorUtils !== 'undefined' && ErrorUtils.setGlobalHandler) {
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    // Always surface it for crash logs / debugging.
    console.error('[wingman] caught global JS error', { isFatal, error });

    // Swallow fatal errors so they do not escalate to the native fatal handler
    // (RCTFatal -> abort). Forwarding non-fatal errors keeps dev tooling intact.
    if (!isFatal && defaultGlobalHandler) {
      defaultGlobalHandler(error, isFatal);
    }
  });
}

// Classic (non-expo-router) entry: register the root App component so the
// hand-built navigation in App.tsx actually mounts.
registerRootComponent(App);
