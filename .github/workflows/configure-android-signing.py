#!/usr/bin/env python3
"""Inject the CI release signing configuration into a generated Capacitor app."""

from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()

if "signingConfigs {" in text and "signingConfigs.release" in text:
    raise SystemExit(0)

signing = '''\n    signingConfigs {\n        release {\n            storeFile file(System.getenv("ANDROID_KEYSTORE_PATH"))\n            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")\n            keyAlias System.getenv("ANDROID_KEY_ALIAS")\n            keyPassword System.getenv("ANDROID_KEY_PASSWORD")\n        }\n    }\n'''

if "buildTypes {" not in text:
    raise SystemExit("Could not find buildTypes block in generated android/app/build.gradle")

text = text.replace("    buildTypes {", signing + "    buildTypes {", 1)
text = text.replace("    buildTypes {\n", "    buildTypes {\n", 1)

release_marker = "        release {\n"
if release_marker not in text:
    raise SystemExit("Could not find release build type in generated android/app/build.gradle")

text = text.replace(
    release_marker,
    release_marker + "            signingConfig signingConfigs.release\n",
    1,
)

path.write_text(text)
