const baseConfig = require('./app.json');

// expo-updates is intentionally NOT installed (removed from package.json) so the
// native ErrorRecovery controller can never initialize and crash at launch.
// Builds 13/15/19 crashed in `expo.controller.errorRecoveryQueue` because the
// native module was compiled in and fired against an invalid update URL; a JS
// `updates.enabled: false` flag does not gate the native module, only removing
// the dependency does. The disabled block below is a belt-and-suspenders guard
// in case the dependency is ever re-added without re-enabling updates here.
module.exports = {
  ...baseConfig.expo,
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: {
    enabled: false,
    checkAutomatically: 'NEVER',
    fallbackToCacheTimeout: 0,
  },
  extra: {
    serverUrl:
      process.env.EXPO_PUBLIC_SERVER_URL
      ?? 'wss://wingman-server-production-5146.up.railway.app/ws',
  },
};
