# Release 17 build notes

Release 17 moves the project from build-pipeline preparation into the first CI build stage.

## CI changes

- Capacitor CLI is invoked with `npx --no-install`, so CI must use the pinned local CLI dependency rather than silently downloading another version.
- CI now checks that `npm install` created a non-empty `package-lock.json`.
- CI verifies that `dist/index.html` exists after the Vite build.
- Android CI accepts the Android SDK licenses before installing API 36/build tools.
- Android and iOS workflows remain manually runnable with GitHub Actions.

## Expected Android artifacts

- Debug APK for physical Android device testing.
- Release AAB; signed only when all four Android signing secrets are configured.

## Current limitation

A committed lockfile is still recommended for deterministic production builds. This environment cannot currently download the npm dependency graph reliably, so the lockfile could not be generated locally.

The first real native build must therefore be executed on the GitHub Actions runner.
