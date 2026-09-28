# Android manifest template

Capacitor generates the real `android/` project during GitHub Actions. The file
`android-manifest.template.xml` is a valid manifest containing the Android
namespace and media/camera/audio permissions.

The workflow repairs and validates the generated
`android/app/src/main/AndroidManifest.xml` after each step that can modify it.
