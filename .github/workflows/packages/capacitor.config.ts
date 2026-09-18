      - name: Sync Capacitor
        run: npx --no-install cap sync android

      # ✅ ONE SCRIPT DOES IT ALL — fixes namespace + adds permissions + validates
      - name: Configure media permissions & fix manifest
        run: python3 .github/workflows/scripts/configure-media-permissions.py .

      # ✅ Final validation — NEVER let a bad file reach Gradle
      - name: Validate final AndroidManifest.xml
        working-directory: android/app/src/main
        run: |
          python3 - <<'PY'
          import xml.etree.ElementTree as ET
          try:
              tree = ET.parse("AndroidManifest.xml")
              root = tree.getroot()
              if 'android' in root.nsmap:
                  print("✅ xmlns:android namespace confirmed")
              else:
                  print("❌ MISSING xmlns:android — FAILING!")
                  exit(1)
              print("✅ AndroidManifest.xml — ALL CHECKS PASSED")
          except Exception as e:
              print(f"❌ VALIDATION FAILED: {e}")
              exit(1)

      - name: Build Android App Bundle
        working-directory: android
        run: ./gradlew --no-daemon --stacktrace bundleRelease
