#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ANDROID_NS = "http://schemas.android.com/apk/res/android"
ANDROID_NAME = f"{{{ANDROID_NS}}}name"
MEDIA_PERMISSIONS = (
    "android.permission.READ_MEDIA_IMAGES",
    "android.permission.READ_MEDIA_VIDEO",
)

ET.register_namespace("android", ANDROID_NS)

def ensure_android_namespace(manifest_path: Path) -> None:
    text = manifest_path.read_text(encoding="utf-8")

    if not re.search(r"<manifest\b[^>]*\bxmlns:android\s*=", text, flags=re.IGNORECASE | re.DOTALL):
        text, count = re.subn(
            r"<manifest\b",
            f'<manifest xmlns:android="{ANDROID_NS}"',
            text,
            count=1,
            flags=re.IGNORECASE,
        )

        if count != 1:
            raise ValueError(f"Could not locate <manifest> root in {manifest_path}")

        manifest_path.write_text(text, encoding="utf-8")
        print(f"Added android namespace to {manifest_path}")
    else:
        print(f"Android namespace already present in {manifest_path}")

def configure_permissions(manifest_path: Path) -> None:
    tree = ET.parse(manifest_path)
    root = tree.getroot()

    if root.tag != "manifest":
        raise ValueError(f"Unexpected root tag: {root.tag!r}")

    seen: set[str] = set()
    duplicates: list[ET.Element] = []

    for permission in root.findall("uses-permission"):
        name = permission.get(ANDROID_NAME)
        if name is None:
            continue
        if name in seen:
            duplicates.append(permission)
        else:
            seen.add(name)

    for permission in duplicates:
        root.remove(permission)

    for permission_name in MEDIA_PERMISSIONS:
        if permission_name not in seen:
            ET.SubElement(root, "uses-permission", {ANDROID_NAME: permission_name})
            seen.add(permission_name)
            print(f"Added {permission_name}")
        else:
            print(f"Already present: {permission_name}")

    tree.write(manifest_path, encoding="utf-8", xml_declaration=True)

def main() -> int:
    if len(sys.argv) > 2:
        print(f"Usage: {sys.argv[0]} [project_root]", file=sys.stderr)
        return 2

    project_root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd().resolve()
    manifest_path = project_root / "android/app/src/main/AndroidManifest.xml"

    if not manifest_path.is_file():
        raise FileNotFoundError(f"Android manifest not found: {manifest_path}")

    try:
        ensure_android_namespace(manifest_path)
        configure_permissions(manifest_path)
        print(f"Manifest updated successfully: {manifest_path}")
        return 0
    except Exception as exc:
        print(f"Failed to configure Android manifest: {exc}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    raise SystemExit(main())
