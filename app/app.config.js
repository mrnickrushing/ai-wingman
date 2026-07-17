const baseConfig = require('./app.json');

const DEFAULT_SERVER_URL = 'wss://wingman-server-production-5146.up.railway.app/ws';
const DEFAULT_EAS_PROJECT_ID = 'e21dfc33-1ab9-4276-9120-b8f891a7aeed';
const envProjectId = process.env.EAS_PROJECT_ID;
const projectId = envProjectId && envProjectId !== 'YOUR_EXPO_PROJECT_ID_HERE'
  ? envProjectId
  : DEFAULT_EAS_PROJECT_ID;
const hasProjectId = Boolean(projectId);
const updatesUrl = process.env.EXPO_UPDATES_URL ?? (hasProjectId ? `https://u.expo.dev/${projectId}` : undefined);
const updatesEnabled = Boolean(updatesUrl);
const updatesChannel = process.env.EXPO_UPDATE_CHANNEL ?? 'production';

// Only add the Sentry config plugin when a DSN is configured, so builds without
// Sentry don't pick up the native source-map/dSYM upload build phase.
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
const basePlugins = baseConfig.expo.plugins ?? [];
// org/project let the build upload source maps when SENTRY_AUTH_TOKEN is set in
// CI; without the token the upload step skips gracefully (crash reporting still
// works at runtime via the DSN).
const plugins = sentryDsn
  ? [...basePlugins, ['@sentry/react-native', { organization: 'rushing-technologies', project: 'ai-wingman' }]]
  : basePlugins;

module.exports = {
  ...baseConfig.expo,
  plugins,
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: updatesEnabled
    ? {
        enabled: true,
        url: updatesUrl,
        requestHeaders: {
          'expo-channel-name': updatesChannel,
        },
        checkAutomatically: 'NEVER',
        fallbackToCacheTimeout: 0,
      }
    : {
        enabled: false,
        checkAutomatically: 'NEVER',
        fallbackToCacheTimeout: 0,
      },
  extra: {
    ...baseConfig.expo.extra,
    serverUrl: process.env.EXPO_PUBLIC_SERVER_URL ?? DEFAULT_SERVER_URL,
    eas: hasProjectId ? { projectId } : undefined,
  },
};
