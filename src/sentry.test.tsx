import {init, reactErrorHandler} from '@sentry/react';
import {render, screen} from '@testing-library/react';
import {createMemoryRouter, RouterProvider} from 'react-router-dom';
import {initSentry} from './sentry';

// The SDK as sentry.ts calls it. Each reactErrorHandler() call returns a fresh
// mock, which stands for the handler that reports to Sentry.
vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  browserTracingIntegration: vi.fn(() => ({name: 'BrowserTracing'})),
  reactErrorHandler: vi.fn(() => vi.fn()),
}));

const DSN = 'https://public@o1.ingest.de.sentry.io/1';

/** What deploy.yml's build sees: a production build given the DSN. */
function stubDeployBuild() {
  vi.stubEnv('PROD', true);
  vi.stubEnv('VITE_SENTRY_DSN', DSN);
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe('initSentry', () => {
  it('starts Sentry with the DSN and browser tracing in a production build', () => {
    stubDeployBuild();

    initSentry();

    expect(init).toHaveBeenCalledOnce();
    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({dsn: DSN, integrations: [{name: 'BrowserTracing'}], tracesSampleRate: 0.1}),
    );
  });

  it('reports the build environment, never a hard-coded production', () => {
    stubDeployBuild();

    initSentry();

    // vite.config.ts pins the fallback under Vitest, whatever VERCEL_ENV the shell has.
    expect(init).toHaveBeenCalledWith(expect.objectContaining({environment: 'unknown'}));
  });

  it('collects no user info, cookies or HTTP bodies', () => {
    stubDeployBuild();

    initSentry();

    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        dataCollection: expect.objectContaining({userInfo: false, cookies: false, httpBodies: []}),
      }),
    );
  });

  it('reports every error React hands its root, and still logs the ones React would have', () => {
    stubDeployBuild();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const hooks = initSentry();
    const report = vi.mocked(reactErrorHandler).mock.results[0].value;
    const error = new Error('boom');

    hooks.onCaughtError?.(error, {componentStack: 'at Page'});
    hooks.onUncaughtError?.(error, {componentStack: 'at Shell'});
    hooks.onRecoverableError?.(error, {componentStack: 'at Root'});

    expect(report).toHaveBeenCalledTimes(3);
    expect(report).toHaveBeenCalledWith(error, {componentStack: 'at Page'});
    // React Router logs the caught one itself.
    expect(consoleError).toHaveBeenCalledTimes(2);
  });

  it.each([
    {label: 'in dev', setUp: () => vi.stubEnv('VITE_SENTRY_DSN', DSN)},
    {label: 'without a DSN', setUp: () => vi.stubEnv('PROD', true)},
  ])('starts nothing $label and leaves React its own error hooks', ({setUp}) => {
    vi.stubEnv('PROD', false);
    vi.stubEnv('VITE_SENTRY_DSN', '');
    setUp();

    expect(initSentry()).toEqual({});
    expect(init).not.toHaveBeenCalled();
  });
});

describe("React Router's error screen", () => {
  function BrokenPage(): never {
    throw new Error('page broke');
  }

  it('sends Sentry the error of a page that fails to render', () => {
    stubDeployBuild();
    // React Router logs the error it catches.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const {onCaughtError} = initSentry();
    const report = vi.mocked(reactErrorHandler).mock.results[0].value;
    const router = createMemoryRouter([{path: '/', element: <BrokenPage />}]);

    render(<RouterProvider router={router} />, {onCaughtError});

    expect(screen.getByRole('heading', {name: 'Unexpected Application Error!'})).toBeInTheDocument();
    expect(report).toHaveBeenCalledWith(expect.objectContaining({message: 'page broke'}), expect.anything());
  });
});
