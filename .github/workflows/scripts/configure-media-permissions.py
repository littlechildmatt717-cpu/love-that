#!/usr/bin/env python3
"""Safely add required media permissions to a Capacitor Android manifest."""

from __future__ import annotations

import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ANDROID_NS = "http://schemas.android.com/apk/res/android"
ANDROID = f"{{{ANDROID_NS}}}name"

ET.register_namespace("android", ANDROID_NS)

PERMISSIONS = (
    "android.permission.CAMERA",
    "android.permission.RECORD_AUDIO",
    "android.permission.READ_MEDIA_IMAGES",
    "android.permission.READ_MEDIA_VIDEO",
    "android.permission.READ_MEDIA_AUDIO",
    "android.permission.READ_EXTERNAL_STORAGE",
)


def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}")


def main() -> int:
    if len(sys.argv) != 2:
        fail(f"Usage: {Path(sys.argv[0]).name} <project-root>")

    root_dir = Path(sys.argv[1]).resolve()
    manifest_path = root_dir / "android/app/src/main/AndroidManifest.xml"

    if not manifest_path.is_file():
        fail(f"Manifest not found: {manifest_path}")

    try:
        tree = ET.parse(manifest_path)
    except ET.ParseError as error:
        fail(
            "The manifest is already malformed before this script runs: "
            f"{error}"
        )

    root = tree.getroot()
    if root.tag != "manifest":
        fail(f"Expected <manifest> root, found {root.tag!r}")

    existing = {
        element.get(ANDROID)
        for element in root.findall("uses-permission")
    }

    for permission in PERMISSIONS:
        if permission in existing:
            continue

        element = ET.Element("uses-permission")
        element.set(ANDROID, permission)
        root.insert(0, element)
        existing.add(permission)

    tree.write(
        manifest_path,
        encoding="utf-8",
        xml_declaration=True,
    )

    try:
        final_tree = ET.parse(manifest_path)
    except ET.ParseError as error:
        fail(f"Manifest became invalid after modification: {error}")

    if final_tree.getroot().tag != "manifest":
        fail("Final manifest has an unexpected root element")

    print(f"Updated and validated {manifest_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
