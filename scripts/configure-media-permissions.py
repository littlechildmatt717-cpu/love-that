#!/usr/bin/env python3

from pathlib import Path
import sys
import xml.etree.ElementTree as ET

ANDROID_NS = "http://schemas.android.com/apk/res/android"
ET.register_namespace("android", ANDROID_NS)

def main():
    project_root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
    manifest = project_root / "android/app/src/main/AndroidManifest.xml"

    if not manifest.is_file():
        raise SystemExit(f"AndroidManifest.xml not found: {manifest}")

    try:
        tree = ET.parse(manifest)
    except ET.ParseError as exc:
        print(manifest.read_text(encoding="utf-8"))
        raise SystemExit(f"Invalid AndroidManifest.xml before permissions: {exc}")

    root = tree.getroot()
    if root.tag != "manifest":
        raise SystemExit(f"Unexpected manifest root: {root.tag}")

    name = f"{{{ANDROID_NS}}}name"
    max_sdk = f"{{{ANDROID_NS}}}maxSdkVersion"

    existing = {}
    for node in root.findall("uses-permission"):
        permission_name = node.get(name)
        if permission_name:
            existing[permission_name] = node

    def ensure_permission(permission_name, max_sdk_value=None):
        node = existing.get(permission_name)

        if node is None:
            node = ET.Element("uses-permission")
            node.set(name, permission_name)

            application = root.find("application")
            if application is None:
                root.append(node)
            else:
                root.insert(list(root).index(application), node)

            existing[permission_name] = node
            print(f"Added {permission_name}")

        if max_sdk_value is not None:
            node.set(max_sdk, str(max_sdk_value))

    ensure_permission("android.permission.READ_MEDIA_IMAGES")
    ensure_permission("android.permission.READ_MEDIA_VIDEO")
    ensure_permission("android.permission.READ_EXTERNAL_STORAGE", 32)

    tree.write(manifest, encoding="utf-8", xml_declaration=True)

    try:
        ET.parse(manifest)
    except ET.ParseError as exc:
        print(manifest.read_text(encoding="utf-8"))
        raise SystemExit(f"Manifest became invalid after permissions: {exc}")

    print("AndroidManifest.xml successfully updated and validated.")

if __name__ == "__main__":
    main()
