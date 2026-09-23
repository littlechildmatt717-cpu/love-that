
#!/usr/bin/env python3

"""
Configure Android media permissions safely.

Usage:
    python3 scripts/configure-media-permissions.py .

The script:
- Locates android/app/src/main/AndroidManifest.xml
- Parses the existing XML
- Adds required media permissions if missing
- Uses the Android XML namespace correctly
- Writes the manifest back as valid XML
"""

from pathlib import Path
import sys
import xml.etree.ElementTree as ET


ANDROID_NS = "http://schemas.android.com/apk/res/android"

ET.register_namespace("android", ANDROID_NS)


def android_attribute(name: str) -> str:
    """Return a fully qualified Android XML attribute name."""
    return f"{{{ANDROID_NS}}}{name}"


def find_manifest(project_root: Path) -> Path:
    """Locate the generated Android manifest."""
    manifest = (
        project_root
        / "android"
        / "app"
        / "src"
        / "main"
        / "AndroidManifest.xml"
    )

    if not manifest.is_file():
        raise FileNotFoundError(
            f"AndroidManifest.xml not found: {manifest}"
        )

    return manifest


def configure_media_permissions(project_root: Path) -> None:
    """Add media permissions to the existing Android manifest."""
    manifest_path = find_manifest(project_root)

    # Parse existing XML. This fails safely if the file is malformed.
    tree = ET.parse(manifest_path)
    root = tree.getroot()

    if (
        root.tag != "manifest"
        and not root.tag.endswith("}manifest")
    ):
        raise RuntimeError(
            f"Unexpected manifest root element: {root.tag}"
        )

    # Permissions required by the application.
    permissions = [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
    ]

    existing_permissions = {
        element.get(android_attribute("name"))
        for element in root.findall("uses-permission")
    }

    for permission in permissions:
        if permission in existing_permissions:
            print(f"Permission already exists: {permission}")
            continue

        ET.SubElement(
            root,
            "uses-permission",
            {
                android_attribute("name"): permission,
            },
        )

        print(f"Added permission: {permission}")

    # Write the existing manifest back using XML serialization.
    tree.write(
        manifest_path,
        encoding="utf-8",
        xml_declaration=True,
    )

    # Verify the saved file can be parsed again.
    ET.parse(manifest_path)

    print(f"Successfully updated: {manifest_path}")
    print("Final manifest is valid XML")


def main() -> int:
    project_root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")

    try:
        configure_media_permissions(project_root)
    except (ET.ParseError, OSError, RuntimeError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
