from pathlib import Path
import sys
import re
import xml.etree.ElementTree as ET

ANDROID_NS = "http://schemas.android.com/apk/res/android"
ET.register_namespace("android", ANDROID_NS)

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('.')

def ensure_android_namespace(path: Path):
    text = path.read_text(encoding="utf-8")
    match = re.search(r"<manifest\b[^>]*>", text, flags=re.IGNORECASE | re.DOTALL)
    if not match:
        raise SystemExit("Could not find Android <manifest> root element.")
    tag = match.group(0)
    if not re.search(r"\bxmlns:android\s*=", tag):
        tag = tag[:-1] + ' xmlns:android="http://schemas.android.com/apk/res/android">'
        text = text[:match.start()] + tag + text[match.end():]
        path.write_text(text, encoding="utf-8")
        print("Added missing Android namespace.")

manifest = root / 'android/app/src/main/AndroidManifest.xml'
if manifest.exists():
    ensure_android_namespace(manifest)
    tree = ET.parse(manifest)
    root_element = tree.getroot()
    if root_element.tag != 'manifest':
        raise SystemExit(f"Unexpected manifest root element: {root_element.tag}")

    name_attr = f"{{{ANDROID_NS}}}name"
    existing = {p.get(name_attr): p for p in root_element.findall('uses-permission') if p.get(name_attr)}

    for name in ("android.permission.CAMERA", "android.permission.RECORD_AUDIO"):
        if name in existing:
            print(f"Already present: {name}")
            continue
        permission = ET.Element('uses-permission')
        permission.set(name_attr, name)
        application = root_element.find('application')
        if application is not None:
            root_element.insert(list(root_element).index(application), permission)
        else:
            root_element.append(permission)
        print(f"Added: {name}")

    tree.write(manifest, encoding='utf-8', xml_declaration=True)
    ET.parse(manifest)
    print('AndroidManifest.xml successfully updated and validated.')

# iOS: add privacy keys independently for idempotent CI runs.
plist = root / 'ios/App/App/Info.plist'
if plist.exists():
    s = plist.read_text(encoding='utf-8')
    additions = []
    if 'NSCameraUsageDescription' not in s:
        additions.extend(['\t<key>NSCameraUsageDescription</key>', '\t<string>love that uses your camera for private video calls and speed dating.</string>'])
    if 'NSMicrophoneUsageDescription' not in s:
        additions.extend(['\t<key>NSMicrophoneUsageDescription</key>', '\t<string>love that uses your microphone for private audio/video calls and speed dating.</string>'])
    if additions:
        close = s.rfind('</dict>')
        if close == -1:
            raise SystemExit('Could not find closing </dict> in iOS Info.plist.')
        s = s[:close] + '\n' + '\n'.join(additions) + '\n' + s[close:]
        plist.write_text(s, encoding='utf-8')
