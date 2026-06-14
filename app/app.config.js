const baseConfig = require('./app.json');

const rawProjectId = process.env.EAS_PROJECT_ID || '';
// Only treat the project as configured for EAS Updates when it's a real
// project id. The eas.json template ships a placeholder ("YOUR_EXPO_PROJECT_ID_HERE"),
// and enabling updates against an invalid `https://u.expo.dev/<placeholder>`
// URL crashes expo-updates on launch in a production build.
const isValidProjectId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawProjectId);
const projectId = isValidProjectId ? rawProjectId : '';

module.exports = {
  ...baseConfig.expo,
  runtimeVersion: {
    policy: 'appVersion',
  },
  ...(projectId
    ? {
        updates: {
          url: `https://u.expo.dev/${projectId}`,
          enabled: true,
          fallbackToCacheTimeout: 0,
          checkAutomatically: 'ON_LOAD',
        },
      }
    : {
        updates: {
          enabled: false,
          checkAutomatically: 'NEVER',
        },
      }),
  extra: {
    eas: {
      projectId,
    },
    serverUrl: process.env.EXPO_PUBLIC_SERVER_URL,
  },
};
