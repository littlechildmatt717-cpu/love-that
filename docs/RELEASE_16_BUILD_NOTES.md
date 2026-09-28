# Release 16 build notes

Release 16 hardens the native media-permission patching and simplifies CI dependency installation.

## Changes

- Android camera and microphone permissions are added independently and idempotently.
- iOS camera and microphone privacy strings are added independently and idempotently.
- GitHub Actions uses the pinned `package.json` versions with `npm install`.
- CI generates a lockfile during the build so the dependency graph is captured for that run.
- A committed `package-lock.json` is still recommended before production release for deterministic `npm ci` builds.

## Android build output

The Android workflow produces:

- `love-that-android-debug-apk-<commit>` — debug APK for device testing.
- `love-that-android-aab-<commit>` — release AAB, signed when the four Android signing secrets are configured; otherwise unsigned.

The workflow is manually runnable with GitHub Actions (`workflow_dispatch`).

## Important

This environment does not contain the Android SDK/Gradle toolchain, so a signed APK/AAB cannot be honestly claimed until the GitHub Actions build completes successfully.
