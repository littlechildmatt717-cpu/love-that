import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ANDROID_NS = "http://schemas.android.com/apk/res/android"
ET.register_namespace('android', ANDROID_NS)

PERMISSIONS = [
    "android.permission.READ_MEDIA_IMAGES",
    "android.permission.READ_MEDIA_VIDEO",
    "android.permission.READ_EXTERNAL_STORAGE",
    "android.permission.CAMERA",
    "android.permission.RECORD_AUDIO",
]

def main(project_root):
    manifest_path = Path(project_root) / "android" / "app" / "src" / "main" / "AndroidManifest.xml"
    
    print(f"📄 Reading: {manifest_path}")
    with open(manifest_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Step 1: Add namespace if missing — ROBUST check (any quote style)
    if not re.search(r'\bxmlns:android\s*=', content):
        print("🔧 Adding missing xmlns:android namespace")
        content = re.sub(
            r'<manifest\b',
            '<manifest xmlns:android="http://schemas.android.com/apk/res/android"',
            content,
            count=1
        )
    
    # Step 2: Parse XML safely
    root = ET.fromstring(content)
    
    # Step 3: Add permissions if not present
    existing = {perm.get(f'{{{ANDROID_NS}}}name') for perm in root.findall('.//uses-permission')}
    
    for perm_name in PERMISSIONS:
        if perm_name not in existing:
            perm_elem = ET.Element('uses-permission')
            perm_elem.set(f'{{{ANDROID_NS}}}name', perm_name)
            root.insert(0, perm_elem)
            print(f"  ✅ Added: {perm_name}")
        else:
            print(f"  ⏭️ Already present: {perm_name}")
    
    # Step 4: Write back with proper XML declaration
    with open(manifest_path, 'wb') as f:
        f.write(b'<?xml version="1.0" encoding="utf-8"?>\n')
        ET.ElementTree(root).write(f, encoding='utf-8')
    
    # Step 5: Validate — CATCH ERRORS EARLY
    try:
        ET.parse(manifest_path)
        print("✅ Manifest is valid XML")
    except ET.ParseError as e:
        print(f"❌ XML ERROR at line {e.lineno}, column {e.offset}: {e}")
        with open(manifest_path) as f:
            print("--- BAD FILE CONTENT ---")
            print(f.read())
            print("--- END ---")
        sys.exit(1)

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '.')
