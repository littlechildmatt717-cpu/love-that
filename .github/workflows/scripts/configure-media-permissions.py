#!/usr/bin/env python3
"""
Configure Android/iOS media permissions safely and idempotently.

This script is intentionally safe for Capacitor-generated Android projects:
- Repairs a missing xmlns:android declaration before XML parsing.
- Parses/writes the manifest with ElementTree instead of brittle string insertion.
- Validates the manifest after every Android modification.
- Leaves unrelated manifest content intact.
"""

from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

ANDROID_NS = "http://schemas.android.com/apk/res/android"
ET.register_namespace("android", ANDROID_NS)

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")

def repair_android_namespace(path: Path) -> None:
    raw = path.read_text(encoding="utf-8")

    # ElementTree cannot parse android:* attributes until the namespace
    # declaration exists. Only add it when it is genuinely missing.
    if re.search(r"<manifest\b", raw) and not re.search(r"\bxmlns:android\s*=", raw):
        repaired = re.sub(
            r"(<manifest\b)",
            r'\1 xmlns:android="http://schemas.android.com/apk/res/android"',
            raw,
            count=1,
        )
        if repaired == raw:
            raise SystemExit("Could not repair missing xmlns:android declaration.")
        path.write_text(repaired, encoding="utf-8")
        print(f"Repaired missing xmlns:android in {path}")

def validate_manifest(path: Path) -> ET.ElementTree:
    try:
        tree = ET.parse(path)
    except ET.ParseError as error:
        print(path.read_text(encoding="utf-8"))
        raise SystemExit(f"Invalid AndroidManifest.xml: {error}")

    root_element = tree.getroot()
    if root_element.tag != "manifest":
        raise SystemExit(f"Unexpected AndroidManifest root element: {root_element.tag}")

    return tree

manifest = root / "android/app/src/main/AndroidManifest.xml"

if manifest.exists():
    repair_android_namespace(manifest)
    tree = validate_manifest(manifest)
    manifest_root = tree.getroot()

    permissions = [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
    ]

    existing = {
        element.get(f"{{{ANDROID_NS}}}name")
        for element in manifest_root.findall("uses-permission")
    }

    changed = False
    for permission in permissions:
        if permission not in existing:
            ET.SubElement(
                manifest_root,
                "uses-permission",
                {f"{{{ANDROID_NS}}}name": permission},
            )
            changed = True

    if changed:
        tree.write(manifest, encoding="utf-8", xml_declaration=True)
        print(f"Updated Android permissions in {manifest}")

    # Final validation after the write.
    validate_manifest(manifest)
    print(f"Valid AndroidManifest.xml: {manifest}")
else:
    print(f"{manifest} not found — Android project has not been generated yet; skipping Android permissions.")

# iOS: add each privacy key independently for idempotent CI runs.
plist = root / "ios/App/App/Info.plist"
if plist.exists():
    s = plist.read_text(encoding="utf-8")
    additions = []
    if "NSCameraUsageDescription" not in s:
        additions.extend([
            "\t<key>NSCameraUsageDescription</key>",
            "\t<string>love that uses your camera for private video calls and speed dating.</string>",
        ])
    if "NSMicrophoneUsageDescription" not in s:
        additions.extend([
            "\t<key>NSMicrophoneUsageDescription</key>",
            "\t<string>love that uses your microphone for private audio/video calls and speed dating.</string>",
        ])
    if additions:
        additions_text = "\n" + "\n".join(additions) + "\n"
        close = s.rfind("</dict>")
        if close == -1:
            raise SystemExit("Could not find closing </dict> in iOS Info.plist.")
        plist.write_text(s[:close] + additions_text + s[close:], encoding="utf-8")
        print(f"Updated iOS privacy permissions in {plist}")
