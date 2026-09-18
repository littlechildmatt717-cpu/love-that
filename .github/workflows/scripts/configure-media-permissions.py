import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ANDROID_NS = "http://schemas.android.com/apk/res/android"
ET.register_namespace('android', ANDROID_NS)

# Permissions to add
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
    
    # Fix missing namespace first
    if 'xmlns:android' not in content:
        print("🔧 Adding missing xmlns:android namespace")
        content = content.replace(
            '<manifest>',
            '<manifest xmlns:android="http://schemas.android.com/apk/res/android">'
        )
    
    # Parse XML properly
    root = ET.fromstring(content)
    
    # Ensure manifest has namespace
    if 'android' not in root.nsmap:
        root.set('xmlns:android', ANDROID_NS)
    
    # Find or create <manifest> root and add permissions
    existing = set()
    for perm in root.findall('.//uses-permission'):
        name = perm.get(f'{{{ANDROID_NS}}}name')
        if name:
            existing.add(name)
    
    added = 0
    for perm_name in PERMISSIONS:
        full_name = perm_name if perm_name.startswith('android.permission.') else f'android.permission.{perm_name}'
        if full_name not in existing:
            perm_elem = ET.Element('uses-permission')
            perm_elem.set(f'{{{ANDROID_NS}}}name', full_name)
            root.insert(0, perm_elem)  # Insert at top inside manifest
            added += 1
            print(f"  ✅ Added: {full_name}")
        else:
            print(f"  ⏭️ Already exists: {full_name}")
    
    if added == 0:
        print("✅ All permissions already present")
    
    # Write back with proper declaration
    tree = ET.ElementTree(root)
    with open(manifest_path, 'wb') as f:
        f.write(b'<?xml version="1.0" encoding="utf-8"?>\n')
        tree.write(f, encoding='utf-8')
    
    print(f"✅ Manifest updated: {manifest_path}")
    
    # Validate
    ET.parse(manifest_path)
    print("✅ XML validation passed")

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '.')
