# love that — GitHub Actions mobile builds

The repository now has separate CI workflows for Android and iOS.

## Android

`.github/workflows/android.yml` runs on Ubuntu and builds:

- a release Android App Bundle (`.aab`)
- a debug Android APK for device testing

It uses Node 22, Java 21, Android SDK 36, and the current Capacitor 8 Android toolchain. Capacitor 8 requires Node 22+, and its Android migration guidance targets SDK 36, AGP 8.13.0 and Java 21.

### Android signing secrets

For a Play Store-ready signed AAB, configure these repository secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

The workflow keeps the keystore in the temporary GitHub runner directory and never commits it.

Without those secrets, CI still produces an unsigned release AAB and a debug APK so the build pipeline can be tested before Play signing is configured.

## iOS

`.github/workflows/ios.yml` runs on a macOS 26 runner and produces an unsigned iOS Simulator `.app` packaged as a ZIP. This validates the Capacitor/iOS project and catches native compilation failures without requiring Apple signing credentials.

A simulator build is **not** an App Store build. Before submitting to Apple, the project still needs Apple Developer signing/provisioning configuration and an archive/export workflow.

GitHub currently provides macOS 26 runners, with Xcode 26.x installed.

## Dependency lockfile

The current `package.json` does not have a committed `package-lock.json`, and several dependencies are currently declared as `latest`. Therefore these workflows use `npm install` for now.

Before production store submission, generate and commit a reviewed `package-lock.json` and pin the frontend/Capacitor versions. Then change both workflows to `npm ci` for reproducible builds.
