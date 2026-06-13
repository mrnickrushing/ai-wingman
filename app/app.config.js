const baseConfig = require('./app.json');

const projectId = process.env.EAS_PROJECT_ID || '';

module.exports = {
  ...baseConfig.expo,
  updates: {
    url: `https://u.expo.dev/${projectId}`,
    enabled: true,
    fallbackToCacheTimeout: 0,
    checkAutomatically: 'ON_LOAD',
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  extra: {
    eas: {
      projectId,
    },
  },
};
