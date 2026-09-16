#!/usr/bin/env python3

import argparse
import xml.etree.ElementTree as ET
from pathlib import Path

ANDROID_NS = "http://schemas.android.com/apk/res/android"
ET.register_namespace("android", ANDROID_NS)

parser = argparse.ArgumentParser()
parser.add_argument("project_root", type=Path)
args = parser.parse_args()

manifest = (
    args.project_root
    / "android"
    / "app"
    / "src"
    / "main"
    / "AndroidManifest.xml"
)

if not manifest.is_file():
    raise SystemExit(f"Android manifest not found: {manifest}")

tree = ET.parse(manifest)
root = tree.getroot()

permissions = [
    "android.permission.READ_MEDIA_IMAGES",
    "android.permission.READ_MEDIA_VIDEO",
]

existing = {
    element.get(f"{{{ANDROID_NS}}}name")
    for element in root.findall("uses-permission")
}

for permission in permissions:
    if permission not in existing:
        ET.SubElement(
            root,
            "uses-permission",
            {f"{{{ANDROID_NS}}}name": permission},
        )

tree.write(manifest, encoding="utf-8", xml_declaration=True)
