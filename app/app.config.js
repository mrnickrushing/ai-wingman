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
    // Fall back to the value baked into app.json (and ultimately the hardcoded
    // client default) instead of clobbering it with `undefined`. The production
    // EAS build does not define EXPO_PUBLIC_SERVER_URL, so writing it
    // unconditionally would overwrite the correct app.json value with undefined
    // and leave the client URL resolution to chance.
    ...baseConfig.expo.extra,
    ...(process.env.EXPO_PUBLIC_SERVER_URL
      ? { serverUrl: process.env.EXPO_PUBLIC_SERVER_URL }
      : {}),
  },
};
