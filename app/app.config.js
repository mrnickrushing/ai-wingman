const baseConfig = require('./app.json');

const projectId = process.env.EAS_PROJECT_ID || '';

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
