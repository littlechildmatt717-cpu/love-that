- name: Validate generated AndroidManifest
  run: |
    python3 - <<'PY'
    import xml.etree.ElementTree as ET
    ET.parse("android/app/src/main/AndroidManifest.xml")
    print("Generated AndroidManifest.xml is valid")
    PY

- name: Configure media permissions
  run: python3 scripts/configure-media-permissions.py .

- name: Validate final AndroidManifest
  run: |
    python3 - <<'PY'
    import xml.etree.ElementTree as ET
    ET.parse("android/app/src/main/AndroidManifest.xml")
    print("Final AndroidManifest.xml is valid")
    PY
