#!/usr/bin/env python3
"""Write a deterministic, valid Capacitor Android manifest and configure media permissions."""
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

ANDROID_NS = "http://schemas.android.com/apk/res/android"
ET.register_namespace("android", ANDROID_NS)
A = lambda name: f"{{{ANDROID_NS}}}{name}"

root_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
manifest_path = root_dir / "android/app/src/main/AndroidManifest.xml"

if not manifest_path.parent.is_dir():
    raise SystemExit(f"Android app directory not found: {manifest_path.parent}")

# Do not try to repair the broken XML with regexes. The failing CI error was
# caused by an unbound android: prefix in the generated manifest. Replace the
# generated app manifest with a known-good, deterministic manifest instead.
manifest = ET.Element("manifest", {"xmlns:android": ANDROID_NS})

permissions = (
    "android.permission.INTERNET",
    "android.permission.CAMERA",
    "android.permission.RECORD_AUDIO",
    "android.permission.READ_MEDIA_IMAGES",
    "android.permission.READ_MEDIA_VIDEO",
)
for permission in permissions:
    ET.SubElement(manifest, "uses-permission", {A("name"): permission})

application = ET.SubElement(manifest, "application", {
    A("allowBackup"): "true",
    A("icon"): "@mipmap/ic_launcher",
    A("label"): "@string/app_name",
    A("roundIcon"): "@mipmap/ic_launcher_round",
    A("supportsRtl"): "true",
    A("theme"): "@style/AppTheme",
})

activity = ET.SubElement(application, "activity", {
    A("name"): ".MainActivity",
    A("label"): "@string/title_activity_main",
    A("theme"): "@style/AppTheme.NoActionBarLaunch",
    A("launchMode"): "singleTask",
    A("exported"): "true",
    A("configChanges"): "orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation|density",
})
intent = ET.SubElement(activity, "intent-filter")
ET.SubElement(intent, "action", {A("name"): "android.intent.action.MAIN"})
ET.SubElement(intent, "category", {A("name"): "android.intent.category.LAUNCHER"})

provider = ET.SubElement(application, "provider", {
    A("name"): "androidx.core.content.FileProvider",
    A("authorities"): "${applicationId}.fileprovider",
    A("exported"): "false",
    A("grantUriPermissions"): "true",
})
ET.SubElement(provider, "meta-data", {
    A("name"): "android.support.FILE_PROVIDER_PATHS",
    A("resource"): "@xml/file_paths",
})

tree = ET.ElementTree(manifest)
tree.write(manifest_path, encoding="utf-8", xml_declaration=True)

# Parse the exact bytes that Gradle will consume.
try:
    parsed = ET.parse(manifest_path)
except ET.ParseError as exc:
    print(manifest_path.read_text(encoding="utf-8"))
    raise SystemExit(f"Generated AndroidManifest.xml is invalid: {exc}")

root = parsed.getroot()
if root.tag != "manifest":
    raise SystemExit(f"Unexpected manifest root: {root.tag!r}")

found = {e.get(A("name")) for e in root.findall("uses-permission")}
missing = set(permissions) - found
if missing:
    raise SystemExit(f"Missing Android permissions: {sorted(missing)}")

# XML ElementTree stores namespace declarations separately, so verify the
# actual serialized file contains exactly one android namespace declaration.
text = manifest_path.read_text(encoding="utf-8")
if text.count('xmlns:android="' + ANDROID_NS + '"') != 1:
    raise SystemExit("AndroidManifest.xml must contain exactly one android namespace declaration")

print(f"AndroidManifest.xml replaced with deterministic valid manifest: {manifest_path}")
print(text)

# iOS privacy entries, when an iOS project exists.
plist = root_dir / "ios/App/App/Info.plist"
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
