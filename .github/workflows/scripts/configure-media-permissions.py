from pathlib import Path
import sys
import xml.etree.ElementTree as ET

ANDROID_NS = "http://schemas.android.com/apk/res/android"

ET.register_namespace("android", ANDROID_NS)

root_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")

# ============================================================
# Android
# ============================================================

manifest_path = root_dir / "android/app/src/main/AndroidManifest.xml"

if manifest_path.exists():
    try:
        tree = ET.parse(manifest_path)
    except ET.ParseError as error:
        print(manifest_path.read_text(encoding="utf-8"))
        raise SystemExit(
            f"Invalid AndroidManifest.xml before permissions update: {error}"
        )

    root = tree.getroot()

    if root.tag != "manifest":
        raise SystemExit(
            f"Unexpected AndroidManifest root element: {root.tag}"
        )

    permissions = [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
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
                {
                    f"{{{ANDROID_NS}}}name": permission
                },
            )

    tree.write(
        manifest_path,
        encoding="utf-8",
        xml_declaration=True,
    )

    # Hard validation after modification.
    try:
        ET.parse(manifest_path)
    except ET.ParseError as error:
        print(manifest_path.read_text(encoding="utf-8"))
        raise SystemExit(
            f"Invalid AndroidManifest.xml after permissions update: {error}"
        )

    print(f"Android permissions configured: {manifest_path}")

else:
    print(f"AndroidManifest.xml not found — skipping: {manifest_path}")


# ============================================================
# iOS
# ============================================================

plist = root_dir / "ios/App/App/Info.plist"

if plist.exists():
    s = plist.read_text(encoding="utf-8")

    additions = []

    if "NSCameraUsageDescription" not in s:
        additions.extend([
            "\t<key>NSCameraUsageDescription</key>",
            "\t<string>love that uses your camera for private video calls and speed dating.</string>",
        ])

    if "NSMicrophoneUsageDescription" not in s:
        additions.extend([
            "\t<key>NSMicrophoneUsageDescription</key>",
            "\t<string>love that uses your microphone for private audio/video calls and speed dating.</string>",
        ])

    if additions:
        additions_text = "\n" + "\n".join(additions) + "\n"
        close = s.rfind("</dict>")

        if close == -1:
            raise SystemExit(
                "Could not find closing </dict> in iOS Info.plist."
            )

        s = s[:close] + additions_text + s[close:]
        plist.write_text(s, encoding="utf-8")

        print(f"iOS privacy permissions configured: {plist}")
