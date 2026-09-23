
#!/usr/bin/env python3

from pathlib import Path
import sys
import xml.etree.ElementTree as ET


ANDROID_NS = "http://schemas.android.com/apk/res/android"
ET.register_namespace("android", ANDROID_NS)


def android_attr(name):
    return f"{{{ANDROID_NS}}}{name}"


def find_manifest(project_root):
    path = (
        project_root
        / "android"
        / "app"
        / "src"
        / "main"
        / "AndroidManifest.xml"
    )

    if not path.is_file():
        raise FileNotFoundError(f"Manifest not found: {path}")

    return path


def configure_permissions(project_root):
    manifest_path = find_manifest(project_root)

    # Parse existing XML.
    tree = ET.parse(manifest_path)
    root = tree.getroot()

    # Confirm the correct root element.
    if root.tag != "manifest" and not root.tag.endswith("}manifest"):
        raise RuntimeError(
            f"Unexpected root element: {root.tag}"
        )

    # Confirm the Android namespace exists on attributes.
    for element in root.iter():
        for attribute in element.attrib:
            if attribute.startswith("{"):
                namespace = attribute.split("}", 1)[0][1:]

                if namespace == ANDROID_NS:
                    continue

    # Permissions to add.
    permissions = [
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
    ]

    # Read existing permission names.
    existing = set()

    for element in root:
        if element.tag == "uses-permission" or element.tag.endswith(
            "}uses-permission"
        ):
            name = element.get(android_attr("name"))

            if name:
                existing.add(name)

    # Add missing permissions using XML elements and namespaced attributes.
    for permission in permissions:
        if permission in existing:
            print(f"Already present: {permission}")
            continue

        permission_element = ET.Element(
            "uses-permission",
            {
                android_attr("name"): permission,
            },
        )

        root.append(permission_element)

        print(f"Added: {permission}")

    # Write the existing XML tree.
    tree.write(
        manifest_path,
        encoding="utf-8",
        xml_declaration=True,
    )

    # Validate the saved manifest.
    ET.parse(manifest_path)

    print(f"Updated and validated: {manifest_path}")


def main():
    project_root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")

    try:
        configure_permissions(project_root)
    except (ET.ParseError, OSError, RuntimeError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
