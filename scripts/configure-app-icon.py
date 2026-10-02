#!/usr/bin/env python3
from pathlib import Path
import shutil
import sys
import xml.etree.ElementTree as ET

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('.')
manifest = root / 'android/app/src/main/AndroidManifest.xml'
source = root / 'public/icon.png'
if not manifest.exists():
    raise SystemExit(f'Missing AndroidManifest.xml: {manifest}')
if not source.exists():
    raise SystemExit(f'Missing logo: {source}')

drawable = root / 'android/app/src/main/res/drawable'
drawable.mkdir(parents=True, exist_ok=True)
shutil.copy2(source, drawable / 'love_that_icon.png')

ns = 'http://schemas.android.com/apk/res/android'
ET.register_namespace('android', ns)
tree = ET.parse(manifest)
app = tree.getroot().find('application')
if app is None:
    raise SystemExit('AndroidManifest.xml has no <application> element.')
app.set(f'{{{ns}}}icon', '@drawable/love_that_icon')
app.set(f'{{{ns}}}roundIcon', '@drawable/love_that_icon')
tree.write(manifest, encoding='utf-8', xml_declaration=True)
print('love that app icon configured from public/icon.png')
