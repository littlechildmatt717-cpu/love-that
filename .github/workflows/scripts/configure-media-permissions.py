#!/usr/bin/env python3
"""Configure media permissions without corrupting Capacitor's XML manifests."""
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

ANDROID_NS = "http://schemas.android.com/apk/res/android"
ET.register_namespace("android", ANDROID_NS)

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
manifest = root / "android/app/src/main/AndroidManifest.xml"


def repair_namespace(path: Path) -> None:
    """Force one canonical android namespace declaration on <manifest>."""
    raw = path.read_text(encoding="utf-8")
    namespace = ANDROID_NS
    match = re.search(r"<manifest\b[^>]*>", raw, flags=re.IGNORECASE | re.DOTALL)
    if not match:
        raise SystemExit(f"No <manifest> root element found in {path}")

    opening = match.group(0)
    opening = re.sub(
        r"\s+xmlns:android\s*=\s*(?:\"[^\"]*\"|'[^']*')",
        "",
        opening,
        flags=re.IGNORECASE,
    )
    opening = opening[:-1] + f' xmlns:android="{namespace}">'
    repaired = raw[:match.start()] + opening + raw[match.end():]
    if repaired != raw:
        path.write_text(repaired, encoding="utf-8")
        print("Forced canonical xmlns:android declaration")


def parse_manifest(path: Path) -> ET.ElementTree:
    try:
        tree = ET.parse(path)
    except ET.ParseError as exc:
        print("----- AndroidManifest.xml -----")
        print(path.read_text(encoding="utf-8"))
        print("----- end AndroidManifest.xml -----")
        raise SystemExit(f"Invalid AndroidManifest.xml: {exc}")

    root_element = tree.getroot()
    if root_element.tag != "manifest":
        raise SystemExit(f"Unexpected manifest root: {root_element.tag}")
    return tree


if manifest.exists():
    # This must happen before ET.parse(), because an unbound android prefix is
    # itself an XML parse error.
    repair_namespace(manifest)
    tree = parse_manifest(manifest)
    manifest_root = tree.getroot()

    permissions = (
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
    )

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
        print("Updated Android media permissions")

    # Always validate the exact bytes that will be consumed by Gradle.
    parse_manifest(manifest)
    final_text = manifest.read_text(encoding="utf-8")
    if not re.search(r'xmlns:android\s*=\s*["\']http://schemas\.android\.com/apk/res/android["\']', final_text):
        raise SystemExit("AndroidManifest.xml is missing the Android namespace after update")
    print(f"Valid AndroidManifest.xml: {manifest}")
else:
    raise SystemExit(f"AndroidManifest.xml not found: {manifest}")


# iOS: add each privacy key independently and idempotently.
plist = root / "ios/App/App/Info.plist"
if plist.exists():
    text = plist.read_text(encoding="utf-8")
    additions = []
    if "NSCameraUsageDescription" not in text:
        additions += [
            "\t<key>NSCameraUsageDescription</key>",
            "\t<string>love that uses your camera for private video calls and speed dating.</string>",
        ]
    if "NSMicrophoneUsageDescription" not in text:
        additions += [
            "\t<key>NSMicrophoneUsageDescription</key>",
            "\t<string>love that uses your microphone for private audio/video calls and speed dating.</string>",
        ]
    if additions:
        close = text.rfind("</dict>")
        if close == -1:
            raise SystemExit("Could not find closing </dict> in iOS Info.plist")
        plist.write_text(text[:close] + "\n" + "\n".join(additions) + "\n" + text[close:], encoding="utf-8")
        print(f"Updated iOS privacy permissions: {plist}")
