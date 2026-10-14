// Admin's own build-time settings. The app's variables are declared in
// upstream/inkweave/apps/web/src/vite-env.d.ts, which tsconfig.app.json also
// includes; the two ImportMetaEnv declarations merge. Sentry's settings keep
// the app's names, VITE_SENTRY_DSN and the __DEPLOY_ENV__ define, so the app's
// declarations cover src/sentry.ts.
interface ImportMetaEnv {
  /** App branch the reveal, image and tuning tools read from and commit to. Unset means master (docs/PLAN.md, D6). */
  readonly VITE_ADMIN_TARGET_BRANCH?: string;
}
