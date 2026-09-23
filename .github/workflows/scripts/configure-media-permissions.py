#!/usr/bin/env python3
"""Safely configure Android and iOS media permissions.

This script repairs a missing Android XML namespace before parsing, edits the
manifest with ElementTree, writes it back, and validates the exact output.
"""
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

ANDROID_NS = "http://schemas.android.com/apk/res/android"
ANDROID_NAME = f"{{{ANDROID_NS}}}name"
ET.register_namespace("android", ANDROID_NS)

PROJECT_ROOT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd().resolve()
MANIFEST = PROJECT_ROOT / "android/app/src/main/AndroidManifest.xml"
PLIST = PROJECT_ROOT / "ios/App/App/Info.plist"


def ensure_android_namespace(path: Path) -> None:
    """Add xmlns:android to the manifest root if it is missing."""
    text = path.read_text(encoding="utf-8")

    match = re.search(r"<manifest\b[^>]*>", text, flags=re.IGNORECASE | re.DOTALL)
    if not match:
        raise SystemExit(f"No <manifest> opening element found in {path}")

    opening_tag = match.group(0)
    namespace_match = re.search(
        r"\bxmlns:android\s*=\s*(['\"])"
        + re.escape(ANDROID_NS)
        + r"\1",
        opening_tag,
    )

    if namespace_match:
        return

    repaired_opening = opening_tag[:-1] + f' xmlns:android="{ANDROID_NS}">'
    repaired_text = text[:match.start()] + repaired_opening + text[match.end():]
    path.write_text(repaired_text, encoding="utf-8")
    print("Added missing xmlns:android to AndroidManifest.xml")


def load_manifest(path: Path) -> ET.ElementTree:
    try:
        tree = ET.parse(path)
    except ET.ParseError as exc:
        print(path.read_text(encoding="utf-8"))
        raise SystemExit(f"Invalid AndroidManifest.xml: {exc}") from exc

    root = tree.getroot()
    if root.tag != "manifest":
        raise SystemExit(f"Unexpected manifest root element: {root.tag!r}")

    return tree


def validate_manifest(path: Path) -> None:
    tree = load_manifest(path)
    root = tree.getroot()

    permission_names = {
        element.get(ANDROID_NAME)
        for element in root.findall("uses-permission")
    }

    if any(name is None for name in permission_names):
        raise SystemExit("A uses-permission element has no android:name attribute")

    text = path.read_text(encoding="utf-8")
    opening = re.search(r"<manifest\b[^>]*>", text, flags=re.IGNORECASE | re.DOTALL)
    if not opening or not re.search(
        r"\bxmlns:android\s*=\s*(['\"])" + re.escape(ANDROID_NS) + r"\1",
        opening.group(0),
    ):
        raise SystemExit("AndroidManifest.xml is missing a valid android namespace")

    print(f"Validated AndroidManifest.xml: {path}")


def configure_android_permissions() -> None:
    if not MANIFEST.is_file():
        raise SystemExit(f"AndroidManifest.xml not found: {MANIFEST}")

    ensure_android_namespace(MANIFEST)
    tree = load_manifest(MANIFEST)
    root = tree.getroot()

    required_permissions = (
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
    )
    existing = {
        element.get(ANDROID_NAME)
        for element in root.findall("uses-permission")
    }

    changed = False
    for permission in required_permissions:
        if permission not in existing:
            ET.SubElement(root, "uses-permission", {ANDROID_NAME: permission})
            changed = True

    # Always write the file once through ElementTree so namespace declarations
    # and android:name attributes are serialized consistently.
    if changed:
        tree.write(MANIFEST, encoding="utf-8", xml_declaration=True)
        print("Added missing Android media permissions")

    # Parse and validate the final bytes Gradle will consume.
    validate_manifest(MANIFEST)


def configure_ios_permissions() -> None:
    if not PLIST.is_file():
        return

    text = PLIST.read_text(encoding="utf-8")
    additions = []

    if "NSCameraUsageDescription" not in text:
        additions.extend([
            "\t<key>NSCameraUsageDescription</key>",
            "\t<string>love that uses your camera for private video calls and speed dating.</string>",
        ])

    if "NSMicrophoneUsageDescription" not in text:
        additions.extend([
            "\t<key>NSMicrophoneUsageDescription</key>",
            "\t<string>love that uses your microphone for private audio/video calls and speed dating.</string>",
        ])

    if additions:
        closing_dict = text.rfind("</dict>")
        if closing_dict == -1:
            raise SystemExit(f"Could not find closing </dict> in {PLIST}")

        updated = (
            text[:closing_dict]
            + "\n"
            + "\n".join(additions)
            + "\n"
            + text[closing_dict:]
        )
        PLIST.write_text(updated, encoding="utf-8")
        print(f"Updated iOS privacy permissions: {PLIST}")


if __name__ == "__main__":
    configure_android_permissions()
    configure_ios_permissions()
