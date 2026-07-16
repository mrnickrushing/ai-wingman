import { initLogger } from 'braintrust';
import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.RAILWAY_ENVIRONMENT_NAME ?? 'development',
    release: process.env.RAILWAY_GIT_COMMIT_SHA,
    sendDefaultPii: false,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
  });
}

if (process.env.BRAINTRUST_API_KEY) {
  initLogger({ projectName: 'ai-wingman', apiKey: process.env.BRAINTRUST_API_KEY });
}
