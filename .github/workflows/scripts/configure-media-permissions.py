      - name: Configure media permissions
        run: |
          if [ -f scripts/configure-media-permissions.py ]; then
            python3 scripts/configure-media-permissions.py .
          else
            echo "⚠️ configure-media-permissions.py not found — skipping"
          fi

      - name: Validate and fix AndroidManifest.xml
        run: |
          python3 <<'PY'
          import re
          import sys
          import xml.etree.ElementTree as ET
          from pathlib import Path

          path = Path("android/app/src/main/AndroidManifest.xml")
          content = path.read_text(encoding="utf-8")

          if not re.search(
              r"<manifest\b[^>]*\bxmlns:android\s*=",
              content,
              flags=re.IGNORECASE | re.DOTALL,
          ):
              content, count = re.subn(
                  r"<manifest\b",
                  '<manifest xmlns:android="http://schemas.android.com/apk/res/android"',
                  content,
                  count=1,
                  flags=re.IGNORECASE,
              )

              if count != 1:
                  raise SystemExit("Could not locate the manifest root element")

              path.write_text(content, encoding="utf-8")

          try:
              tree = ET.parse(path)
          except ET.ParseError as error:
              print(f"Invalid AndroidManifest.xml: {error}", file=sys.stderr)
              print(path.read_text(encoding="utf-8"), file=sys.stderr)
              raise

          root = tree.getroot()
          if root.tag != "manifest":
              raise SystemExit("The manifest root element is invalid")

          print("AndroidManifest.xml is valid XML")
          PY

      - name: Print Android manifest
        run: nl -ba android/app/src/main/AndroidManifest.xml
