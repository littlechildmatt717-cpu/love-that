#!/usr/bin/env python3

from pathlib import Path
import sys
import xml.etree.ElementTree as ET


ANDROID_NS = "http://schemas.android.com/apk/res/android"
ET.register_namespace("android", ANDROID_NS)


def android_attr(name):
    return f"{{{ANDROID_NS}}}{name}"


def configure_android(root):
    manifest = root / "android/app/src/main/AndroidManifest.xml"

    if not manifest.exists():
        raise SystemExit(f"AndroidManifest.xml not found: {manifest}")

    # Parse the existing manifest as real XML.
    try:
        tree = ET.parse(manifest)
    except ET.ParseError as error:
        raise SystemExit(
            f"AndroidManifest.xml is not valid XML before permissions are added: {error}"
        )

    manifest_root = tree.getroot()

    if manifest_root.tag != "manifest":
        raise SystemExit(
            f"Unexpected Android manifest root element: {manifest_root.tag}"
        )

    # Android permissions use the Android XML namespace.
    name_attr = android_attr("name")
    max_sdk_attr = android_attr("maxSdkVersion")

    # Collect existing permissions so this script is safe to run repeatedly.
    existing_permissions = {}

    for permission in manifest_root.findall("uses-permission"):
        name = permission.get(name_attr)

        if name:
            existing_permissions[name] = permission

    def add_permission(name, max_sdk=None):
        if name in existing_permissions:
            permission = existing_permissions[name]

            if max_sdk is not None:
                permission.set(max_sdk_attr, str(max_sdk))

            print(f"Android permission already present: {name}")
            return

        permission = ET.Element("uses-permission")
        permission.set(name_attr, name)

        if max_sdk is not None:
            permission.set(max_sdk_attr, str(max_sdk))

        # Android expects uses-permission elements before application.
        application = manifest_root.find("application")

        if application is not None:
            index = list(manifest_root).index(application)
            manifest_root.insert(index, permission)
        else:
            manifest_root.append(permission)

        existing_permissions[name] = permission
        print(f"Added Android permission: {name}")

    # Camera and microphone permissions.
    add_permission("android.permission.CAMERA")
    add_permission("android.permission.RECORD_AUDIO")

    # Media permissions for Android versions that require them.
    add_permission("android.permission.READ_MEDIA_IMAGES")
    add_permission("android.permission.READ_MEDIA_VIDEO")

    # Legacy storage permission for Android 12 and earlier.
    add_permission(
        "android.permission.READ_EXTERNAL_STORAGE",
        max_sdk=32,
    )

    # Write the XML back with the Android namespace correctly declared.
    tree.write(
        manifest,
        encoding="utf-8",
        xml_declaration=True,
    )

    # Parse it again to make absolutely sure the resulting XML is valid.
    try:
        ET.parse(manifest)
    except ET.ParseError as error:
        raise SystemExit(
            f"AndroidManifest.xml became invalid after permissions were added: {error}"
        )

    # Confirm the Android namespace is actually present in the written file.
    content = manifest.read_text(encoding="utf-8")

    if 'xmlns:android="http://schemas.android.com/apk/res/android"' not in content:
        raise SystemExit(
            "AndroidManifest.xml is missing the required xmlns:android namespace."
        )

    print("AndroidManifest.xml successfully updated and validated.")
    print("Android namespace is present.")


def configure_ios(root):
    plist = root / "ios/App/App/Info.plist"

    if not plist.exists():
        return

    s = plist.read_text(encoding="utf-8")

    additions = []

    if "NSCameraUsageDescription" not in s:
        additions.extend(
            [
                "\t<key>NSCameraUsageDescription</key>",
                "\t<string>love that uses your camera for private video calls and speed dating.</string>",
            ]
        )

    if "NSMicrophoneUsageDescription" not in s:
        additions.extend(
            [
                "\t<key>NSMicrophoneUsageDescription</key>",
                "\t<string>love that uses your microphone for private audio/video calls and speed dating.</string>",
            ]
        )

    if additions:
        additions_text = "\n" + "\n".join(additions) + "\n"

        close = s.rfind("</dict>")

        if close == -1:
            raise SystemExit(
                "Could not find closing </dict> in iOS Info.plist."
            )

        s = s[:close] + additions_text + s[close:]

        plist.write_text(s, encoding="utf-8")

        print("iOS camera/microphone permissions configured.")
    else:
        print("iOS camera/microphone permissions already present.")


def main():
    project_root = (
        Path(sys.argv[1])
        if len(sys.argv) > 1
        else Path(".")
    )

    configure_android(project_root)
    configure_ios(project_root)

    print("Media permission configuration completed successfully.")


if __name__ == "__main__":
    main()
