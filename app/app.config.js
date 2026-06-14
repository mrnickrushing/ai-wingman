const baseConfig = require('./app.json');

const DEFAULT_SERVER_URL = 'wss://wingman-server-production-5146.up.railway.app/ws';
const projectId = process.env.EAS_PROJECT_ID;
const hasProjectId = Boolean(projectId && projectId !== 'YOUR_EXPO_PROJECT_ID_HERE');
const updatesUrl = process.env.EXPO_UPDATES_URL ?? (hasProjectId ? `https://u.expo.dev/${projectId}` : undefined);
const updatesEnabled = Boolean(updatesUrl);

module.exports = {
  ...baseConfig.expo,
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: updatesEnabled
    ? {
        enabled: true,
        url: updatesUrl,
        checkAutomatically: 'ON_LOAD',
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
