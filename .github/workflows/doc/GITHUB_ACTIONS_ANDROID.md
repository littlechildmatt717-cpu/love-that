# love that — GitHub Actions Android build

The repository contains `.github/workflows/android.yml` for building the Capacitor Android application on GitHub-hosted Ubuntu runners.

## What the workflow does

1. Checks out the repository.
2. Installs Node.js 22 and Java 21.
3. Installs the Android SDK.
4. Installs npm dependencies.
5. Builds the Vite web application.
6. Generates the Capacitor Android project with `npx cap add android`.
7. Syncs Capacitor.
8. Builds a release Android App Bundle (`.aab`).
9. Builds a debug APK for device testing.
10. Uploads both artifacts to the GitHub Actions run.

## Android Play signing secrets

For a Play Store-ready signed AAB, add these GitHub repository secrets:

- `ANDROID_KEYSTORE_BASE64` — base64-encoded release keystore.
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

The workflow only enables release signing when all four values are present. If they are not present, the release AAB is still built as an unsigned artifact for CI/testing, while the debug APK is always produced.

Do not commit the keystore, passwords, or private signing material to the repository.

## Important dependency note

The current project does not contain a `package-lock.json`, and the package manifest currently uses `latest` for most frontend/Capacitor dependencies. The workflow therefore uses `npm install` rather than `npm ci`.

For reproducible production builds, commit a reviewed `package-lock.json` and pin the dependency versions before the first store release. Then change the workflow to `npm ci`.
