#!/usr/bin/env python3
from __future__ import annotations

import re
import sys
from pathlib import Path
import xml.etree.ElementTree as ET

manifest_path = Path("android/app/src/main/AndroidManifest.xml")
if not manifest_path.exists():
    print(f"Android manifest not found: {manifest_path}")
    raise SystemExit(1)

source = manifest_path.read_text(encoding="utf-8")

# If the manifest is already structurally valid, keep it as-is.
try:
    root = ET.fromstring(source)
    if root.tag.endswith("manifest") and 'http://schemas.android.com/apk/res/android' in source:
        print(f"Manifest already valid: {manifest_path}")
        raise SystemExit(0)
except ET.ParseError:
    pass

# Add the Android XML namespace to the manifest tag first if missing.
match = re.search(r"<manifest\b([^>]*)>", source)
if not match:
    print(f"Could not find a <manifest> tag in {manifest_path}")
    raise SystemExit(1)

attrs = match.group(1)
if "xmlns:android=" not in attrs:
    replacement = f'<manifest xmlns:android="http://schemas.android.com/apk/res/android"{attrs}>'
    fixed = source[: match.start()] + replacement + source[match.end() :]
    manifest_path.write_text(fixed, encoding="utf-8")
    print(f"Added Android namespace to {manifest_path}")
else:
    print(f"Android namespace already present in {manifest_path}")

# Validate the final XML to catch malformed output before Gradle runs.
try:
    ET.parse(str(manifest_path))
    print(f"Validated Android manifest: {manifest_path}")
except ET.ParseError as exc:
    print(f"Manifest is still invalid after namespace fix: {exc}")
    with manifest_path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            print(f"{line_number:4}: {line.rstrip()}")
    raise SystemExit(1)
