      - name: Sync Capacitor
        run: npx --no-install cap sync android

      # ✅ EVERYTHING IN ONE STEP — No external files, no path issues
      - name: Fix manifest + add permissions — ALL INLINE
        working-directory: android/app/src/main
        run: |
          python3 <<'PYTHON'
          import re
          import xml.etree.ElementTree as ET
          from pathlib import Path
          
          MANIFEST = "AndroidManifest.xml"
          ANDROID_NS = "http://schemas.android.com/apk/res/android"
          ET.register_namespace('android', ANDROID_NS)
          
          # 1. READ RAW
          with open(MANIFEST, "r", encoding="utf-8") as f:
              content = f.read()
          
          print("📄 BEFORE — First 5 lines:")
          print("\n".join(content.splitlines()[:5]))
          
          # 2. ADD NAMESPACE — ROBUST
          if not re.search(r'\bxmlns:android\s*=', content):
              print("🔧 Adding xmlns:android namespace...")
              content = re.sub(
                  r'<manifest\b',
                  '<manifest xmlns:android="http://schemas.android.com/apk/res/android"',
                  content,
                  count=1
              )
          
          # 3. PARSE AND ADD PERMISSIONS
          root = ET.fromstring(content)
          
          PERMS = [
              "android.permission.READ_MEDIA_IMAGES",
              "android.permission.READ_MEDIA_VIDEO",
              "android.permission.READ_EXTERNAL_STORAGE",
              "android.permission.CAMERA",
              "android.permission.RECORD_AUDIO",
          ]
          
          existing = {p.get(f"{{{ANDROID_NS}}}name") for p in root.findall(".//uses-permission")}
          
          for pname in PERMS:
              if pname not in existing:
                  elem = ET.Element("uses-permission")
                  elem.set(f"{{{ANDROID_NS}}}name", pname)
                  root.insert(0, elem)
                  print(f"  ✅ Added: {pname}")
          
          # 4. WRITE BACK
          tree = ET.ElementTree(root)
          with open(MANIFEST, "wb") as f:
              f.write(b'<?xml version="1.0" encoding="utf-8"?>\n')
              tree.write(f, encoding="utf-8")
          
          # 5. VALIDATE — FAIL FAST IF BROKEN
          try:
              tree = ET.parse(MANIFEST)
              print("\n✅ AFTER — First 5 lines:")
              with open(MANIFEST, "r", encoding="utf-8") as f:
                  print("\n".join(f.read().splitlines()[:5]))
              print("\n✅ ✅ ✅ MANIFEST IS VALID — READY TO BUILD ✅ ✅ ✅")
          except Exception as e:
              print(f"\n❌ FINAL VALIDATION FAILED: {e}")
              with open(MANIFEST, "r", encoding="utf-8") as f:
                  print("--- BAD FILE ---")
                  print(f.read())
                  print("--- END ---")
              exit(1)
          PYTHON

      - name: Build Android App Bundle
        working-directory: android
        run: ./gradlew --no-daemon --stacktrace bundleRelease
