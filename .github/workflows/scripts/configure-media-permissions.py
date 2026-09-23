#!/usr/bin/env python3

from pathlib import Path
import sys
import xml.etree.ElementTree as ET

ANDROID_NS = "http://schemas.android.com/apk/res/android"
ANDROID_ATTR = f"{{{ANDROID_NS}}}name"
ET.register_namespace("android", ANDROID_NS)

PERMISSIONS = (
    "android.permission.READ_MEDIA_IMAGES",
    "android.permission.READ_MEDIA_VIDEO",
)


def get_manifest(project_root: Path) -> Path:
    path = project_root / "android" / "app" / "src" / "main" / "AndroidManifest.xml"
    if not path.is_file():
        raise FileNotFoundError(f"AndroidManifest.xml not found: {path}")
    return path


def configure_manifest(path: Path) -> None:
    try:
        tree = ET.parse(path)
    except ET.ParseError as exc:
        raise RuntimeError(f"Manifest is invalid before modification: {exc}") from exc

    root = tree.getroot()
    if root.tag != "manifest":
        raise RuntimeError(f"Unexpected root element: {root.tag}")

    existing = {
        element.attrib.get(ANDROID_ATTR)
        for element in root.findall("uses-permission")
    }

    additions = []
    for permission_name in PERMISSIONS:
        if permission_name in existing:
            print(f"Permission already present: {permission_name}")
            continue

        permission = ET.Element("uses-permission")
        permission.set(ANDROID_ATTR, permission_name)
        root.insert(0, permission)
        additions.append(permission_name)

    tree.write(path, encoding="utf-8", xml_declaration=True)

    try:
        ET.parse(path)
    except ET.ParseError as exc:
        raise RuntimeError(f"Manifest is invalid after modification: {exc}") from exc

    for permission_name in additions:
        print(f"Added permission: {permission_name}")
    print("AndroidManifest.xml updated and validated successfully.")


def main() -> int:
    project_root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
    try:
        configure_manifest(get_manifest(project_root))
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
