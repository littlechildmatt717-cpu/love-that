#!/usr/bin/env python3

from pathlib import Path
import sys
import xml.etree.ElementTree as ET

ANDROID_NS = "http://schemas.android.com/apk/res/android"
ET.register_namespace("android", ANDROID_NS)

def main():
    project_root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
    manifest = project_root / "android/app/src/main/AndroidManifest.xml"

    if not manifest.exists():
        raise SystemExit(f"AndroidManifest.xml not found: {manifest}")

    tree = ET.parse(manifest)
    root = tree.getroot()

    if root.tag != "manifest":
        raise SystemExit(f"Unexpected manifest root element: {root.tag}")

    name_attr = f"{{{ANDROID_NS}}}name"
    max_sdk_attr = f"{{{ANDROID_NS}}}maxSdkVersion"

    existing = {}
    for permission in root.findall("uses-permission"):
        name = permission.get(name_attr)
        if name:
            existing[name] = permission

    def add_permission(name, max_sdk=None):
        if name in existing:
            if max_sdk is not None:
                existing[name].set(max_sdk_attr, str(max_sdk))
            print(f"Already present: {name}")
            return

        permission = ET.Element("uses-permission")
        permission.set(name_attr, name)
        if max_sdk is not None:
            permission.set(max_sdk_attr, str(max_sdk))

        application = root.find("application")
        if application is not None:
            index = list(root).index(application)
            root.insert(index, permission)
        else:
            root.append(permission)

        existing[name] = permission
        print(f"Added: {name}")

    add_permission("android.permission.READ_MEDIA_IMAGES")
    add_permission("android.permission.READ_MEDIA_VIDEO")
    add_permission("android.permission.READ_EXTERNAL_STORAGE", 32)

    tree.write(manifest, encoding="utf-8", xml_declaration=True)
    ET.parse(manifest)

    print("AndroidManifest.xml successfully updated and validated.")

if __name__ == "__main__":
    main()
