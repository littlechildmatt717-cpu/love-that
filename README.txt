LOVE THAT - AUTH + LOGO REPLACEMENT FILES

REPLACE:
  src/main.jsx

ADD/REPLACE:
  resources/icon.png
  resources/icon-192.png
  resources/icon-512.png

ANDROID LAUNCHER ICONS:
  android-res/mipmap-mdpi/*
  android-res/mipmap-hdpi/*
  android-res/mipmap-xhdpi/*
  android-res/mipmap-xxhdpi/*
  android-res/mipmap-xxxhdpi/*

IMPORTANT:
Your GitHub Actions workflow currently generates the android/ directory with Capacitor when it is missing. Therefore, do not rely on manually uploading android/app/src/main/res/... to the repository unless the android directory is committed. The build workflow should copy these supplied icon files into the generated Android project before Gradle runs.
