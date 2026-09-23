      - name: Sync Capacitor
        run: npx --no-install cap sync android

      - name: Configure media permissions
        run: |
          if [ -f scripts/configure-media-permissions.py ]; then
            python3 scripts/configure-media-permissions.py .
          fi

      - name: Validate Android manifest
        run: |
          python3 - <<'PY'
          import xml.etree.ElementTree as ET

          path = "android/app/src/main/AndroidManifest.xml"
          ET.parse(path)
          print(f"Valid XML: {path}")
          PY

          sed -n '1,200p' android/app/src/main/AndroidManifest.xml
