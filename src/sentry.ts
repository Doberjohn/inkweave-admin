import {browserTracingIntegration, init, reactErrorHandler, type BrowserOptions} from '@sentry/react';
import type {ErrorInfo, RootOptions} from 'react-dom/client';

/*
 * Error reporting to Sentry's inkweave-admin project, set up as the app's is
 * (upstream/inkweave/apps/web/src/shared/lib/sentry.ts) but started with the
 * page. The app loads Sentry after `load` to keep it off the critical path for
 * page speed. Admin has no such budget, and starting first means an error in a
 * module as it loads, or in the first render, is reported too.
 */

/**
 * Starts Sentry in a production build given VITE_SENTRY_DSN (deploy.yml passes
 * it) and returns createRoot's error hooks, which send Sentry what React
 * catches. Anywhere else (dev, tests, a build without the DSN) it starts
 * nothing and returns no hooks, so React keeps its own.
 */
export function initSentry(): RootOptions {
  // Literal env checks, so a build without the DSN leaves the SDK out.
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!import.meta.env.PROD || !dsn) return {};
  init({dsn, ...sentryOptions()});
  const report = reactErrorHandler();
  // React's defaults for these two pass the error to window.reportError, which
  // logs it, and Sentry's global handler would report it again without the
  // component stack. This reports it once and still logs it.
  const reportAndLog = (error: unknown, errorInfo: ErrorInfo) => {
    report(error, errorInfo);
    console.error(error);
  };
  return {
    // React Router's error screen catches every render error, and logs it, so
    // those errors reach Sentry only through this hook.
    onCaughtError: report,
    onUncaughtError: reportAndLog,
    onRecoverableError: reportAndLog,
  };
}

function sentryOptions(): BrowserOptions {
  // As in the app: Sentry 11 collects user info, cookies, request and response
  // bodies and query data by default (v10 did not), and admin's requests carry
  // the GitHub token and whole files on their way to GitHub. This is the
  // migration guide's block for v10's restrictive defaults. Sentry filters the
  // token's Authorization header whatever it says; piiDeny also drops IP, proxy
  // and user identifiers from headers and query params.
  const piiDeny = {deny: ['forwarded', '-ip', 'remote-', 'via', '-user']};

  return {
    // production for deploy.yml's build, unknown for any other (vite.config.ts).
    environment: __DEPLOY_ENV__,
    integrations: [browserTracingIntegration()],
    tracesSampleRate: 0.1,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: {request: piiDeny, response: piiDeny},
      httpBodies: [],
      urlQueryParams: piiDeny,
      genAI: {inputs: false, outputs: false},
      databaseQueryData: false,
      queues: false,
      graphQL: {document: false, variables: false},
    },
  };
}

/** main.tsx imports this module first, so Sentry starts before admin's other modules run. */
export const sentryRootOptions = initSentry();
