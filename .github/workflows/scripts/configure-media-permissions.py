from pathlib import Path
import sys
import xml.etree.ElementTree as ET

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('.')

# Android: add each permission independently so the script remains idempotent
# even if a generated Capacitor template already contains one of them.
manifest = root / 'android/app/src/main/AndroidManifest.xml'
if manifest.exists():
    try:
        ET.parse(manifest)
    except ET.ParseError as exc:
        raise SystemExit(f"Android manifest is invalid XML: {manifest}\n{exc}")

    s = manifest.read_text(encoding="utf-8")
    permissions = [
        '<uses-permission android:name="android.permission.CAMERA" />',
        '<uses-permission android:name="android.permission.RECORD_AUDIO" />',
    ]
    missing = [p for p in permissions if p not in s]
    if missing:
        insertion = ''.join(f'\n    {p}' for p in missing)
        manifest_tag_end = s.find('>')
        if manifest_tag_end == -1:
            raise SystemExit('Could not find Android <manifest> tag.')
        s = s[:manifest_tag_end + 1] + insertion + s[manifest_tag_end + 1:]
        manifest.write_text(s, encoding="utf-8")

# iOS: add each privacy key independently for idempotent CI runs.
plist = root / 'ios/App/App/Info.plist'
if plist.exists():
    s = plist.read_text(encoding="utf-8")
    additions = []
    if 'NSCameraUsageDescription' not in s:
        additions.extend([
            '\t<key>NSCameraUsageDescription</key>',
            '\t<string>love that uses your camera for private video calls and speed dating.</string>',
        ])
    if 'NSMicrophoneUsageDescription' not in s:
        additions.extend([
            '\t<key>NSMicrophoneUsageDescription</key>',
            '\t<string>love that uses your microphone for private audio/video calls and speed dating.</string>',
        ])
    if additions:
        additions_text = '\n' + '\n'.join(additions) + '\n'
        close = s.rfind('</dict>')
        if close == -1:
            raise SystemExit('Could not find closing </dict> in iOS Info.plist.')
        s = s[:close] + additions_text + s[close:]
        plist.write_text(s, encoding="utf-8")
