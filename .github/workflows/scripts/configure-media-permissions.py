
      - name: Configure media permissions
        run: |
          python3 "${{ steps.locate_permissions_script.outputs.script }}" .

      - name: Repair and validate Android namespace
        working-directory: android/app/src/main
        run: |
          python3 - <<'PY'
          from pathlib import Path
          import re
          import xml.etree.ElementTree as ET

          path = Path("AndroidManifest.xml")
          android_ns = "http://schemas.android.com/apk/res/android"

          content = path.read_text(encoding="utf-8")

          # Locate the opening manifest element.
          match = re.search(
              r"<manifest\b[^>]*>",
              content,
              flags=re.IGNORECASE,
          )

          if not match:
              raise SystemExit(
                  "ERROR: Opening <manifest> element not found"
              )

          opening_tag = match.group(0)

          # Add the namespace only when it is absent.
          if "xmlns:android" not in opening_tag:
              repaired_tag = opening_tag[:-1].rstrip()

              if repaired_tag.endswith("/"):
                  repaired_tag = repaired_tag[:-1].rstrip()

              repaired_tag += (
                  f' xmlns:android="{android_ns}">'
              )

              content = (
                  content[:match.start()]
                  + repaired_tag
                  + content[match.end():]
              )

              path.write_text(content, encoding="utf-8")

              print("Added missing android namespace declaration.")
          else:
              print("Android namespace declaration already present.")

          # Parse the repaired manifest.
          tree = ET.parse(path)
          root = tree.getroot()

          if root.tag != "manifest" and not root.tag.endswith("}manifest"):
              raise SystemExit(
                  f"Unexpected root element: {root.tag!r}"
              )

          print("AndroidManifest.xml is valid XML.")
          PY

      - name: Print final Android manifest
        run: |
          echo "===== FINAL MANIFEST ====="
          nl -ba android/app/src/main/AndroidManifest.xml
