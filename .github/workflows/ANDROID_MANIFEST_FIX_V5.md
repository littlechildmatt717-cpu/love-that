# love-that Android manifest fix — V5

The Android build was failing at `:app:processReleaseMainManifest` with:

`The prefix "android" for attribute "android:name" ... is not bound.`

V5 changes the CI flow so the Android project is regenerated on every build, then the generated manifest is repaired and parsed before Gradle runs. The media-permissions script now repairs an unbound `android:` namespace before parsing, writes the manifest with Python's XML serializer, and parses the exact final file again.

The previous brittle sequence of multiple regex namespace patches was removed. There is now one authoritative manifest repair/validation step immediately before Gradle.
