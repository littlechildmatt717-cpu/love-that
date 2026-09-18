      - name: Sync Capacitor
        run: npx --no-install cap sync android

      # ✅ Use the FIXED script — XML-safe, no corruption
      - name: Configure media permissions
        run: python3 .github/workflows/scripts/configure-media-permissions.py .

      # ✅ Validate before build — catch problems early
      - name: Validate AndroidManifest.xml
        working-directory: android/app/src/main
        run: |
          python3 - <<'PY'
          import xml.etree.ElementTree as ET
          try:
              tree = ET.parse("AndroidManifest.xml")
              root = tree.getroot()
              ns = "http://schemas.android.com/apk/res/android"
              if 'android' in root.nsmap:
                  print("✅ Namespace present")
              else:
                  print("❌ MISSING xmlns:android namespace!")
                  exit(1)
              print("✅ Manifest is valid XML")
          except Exception as e:
              print(f"❌ XML PARSE ERROR: {e}")
              exit(1)
          # Print first 10 lines for debug
          print("\n📄 Manifest preview:")
          with open("AndroidManifest.xml") as f:
              for i, line in enumerate(f):
                  if i < 10: print(line.rstrip())
          PY

      - name: Build Android App Bundle
        working-directory: android
        run: ./gradlew --no-daemon --stacktrace bundleRelease
