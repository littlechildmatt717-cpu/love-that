#!/usr/bin/env python3
"""Create a deterministic, valid Capacitor Android manifest with required permissions."""
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

ANDROID_NS = "http://schemas.android.com/apk/res/android"
ANDROID_NAME = f"{{{ANDROID_NS}}}name"
ET.register_namespace("android", ANDROID_NS)

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
manifest = root / "android/app/src/main/AndroidManifest.xml"

if not manifest.is_file():
    raise SystemExit(f"AndroidManifest.xml not found: {manifest}")

# First make sure the existing manifest is parseable. The previous workflow
# could leave an unbound android: prefix, which cannot be repaired by ET.parse.
raw = manifest.read_text(encoding="utf-8")
try:
    tree = ET.ElementTree(ET.fromstring(raw))
except ET.ParseError as exc:
    # A common failure is an opening <manifest> tag without xmlns:android.
    # Repair that exact root declaration, then parse again.
    start = raw.find("<manifest")
    end = raw.find(">", start)
    if start < 0 or end < 0:
        raise SystemExit(f"Cannot locate <manifest> opening tag: {exc}")
    opening = raw[start:end + 1]
    import re
    opening = re.sub(r"\s+xmlns:android\s*=\s*(?:\"[^\"]*\"|'[^']*')", "", opening)
    opening = opening[:-1] + f' xmlns:android="{ANDROID_NS}">'
    raw = raw[:start] + opening + raw[end + 1:]
    manifest.write_text(raw, encoding="utf-8")
    try:
        tree = ET.ElementTree(ET.fromstring(raw))
    except ET.ParseError as second:
        print(raw)
        raise SystemExit(f"AndroidManifest.xml remains invalid after namespace repair: {second}")

root_element = tree.getroot()
if root_element.tag != "manifest":
    raise SystemExit(f"Unexpected manifest root: {root_element.tag!r}")

# Remove duplicate permissions and then add the required set exactly once.
required = (
    "android.permission.INTERNET",
    "android.permission.CAMERA",
    "android.permission.RECORD_AUDIO",
    "android.permission.READ_MEDIA_IMAGES",
    "android.permission.READ_MEDIA_VIDEO",
)

seen = set()
children = list(root_element)
for child in children:
    if child.tag == "uses-permission":
        name = child.get(ANDROID_NAME)
        if name in seen or name not in required:
            if name in seen:
                root_element.remove(child)
            continue
        seen.add(name)

for permission in required:
    if permission not in seen:
        element = ET.Element("uses-permission")
        element.set(ANDROID_NAME, permission)
        root_element.insert(0, element)
        seen.add(permission)

# Write and immediately parse the exact bytes Gradle will read.
tree.write(manifest, encoding="utf-8", xml_declaration=True)
try:
    final_tree = ET.parse(manifest)
except ET.ParseError as exc:
    print(manifest.read_text(encoding="utf-8"))
    raise SystemExit(f"Final AndroidManifest.xml is invalid: {exc}")

final_root = final_tree.getroot()
if final_root.tag != "manifest":
    raise SystemExit(f"Final manifest has unexpected root: {final_root.tag!r}")

# Confirm every android:name attribute is namespace-qualified.
for element in final_root.iter():
    for attribute in element.attrib:
        if attribute.startswith("android:"):
            raise SystemExit(f"Unqualified android attribute remained: {attribute}")

print(f"AndroidManifest.xml repaired and validated: {manifest}")
print(manifest.read_text(encoding="utf-8"))

# iOS privacy entries, when an iOS project exists.
plist = root / "ios/App/App/Info.plist"
if plist.exists():
    text = plist.read_text(encoding="utf-8")
    additions = []
    if "NSCameraUsageDescription" not in text:
        additions += [
            "\t<key>NSCameraUsageDescription</key>",
            "\t<string>love that uses your camera for private video calls and speed dating.</string>",
        ]
    if "NSMicrophoneUsageDescription" not in text:
        additions += [
            "\t<key>NSMicrophoneUsageDescription</key>",
            "\t<string>love that uses your microphone for private audio/video calls and speed dating.</string>",
        ]
    if additions:
        close = text.rfind("</dict>")
        if close == -1:
            raise SystemExit("Could not find closing </dict> in iOS Info.plist")
        plist.write_text(text[:close] + "\n" + "\n".join(additions) + "\n" + text[close:], encoding="utf-8")
        print(f"Updated iOS privacy permissions: {plist}")
