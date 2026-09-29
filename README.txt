love that - profile, preferences and media upload fix

Replace/upload:
  src/main.jsx

Add/run in Supabase:
  expand_profiles_for_richer_dating_preferences.sql

The SQL migration has already been applied to the connected Supabase project used by this app.

This update adds:
- Rich profile editing: name, age, height, body type, religion, marital status, job title, bio, interests and hobbies.
- Multiple-choice looking-for preferences, including men, women, men & women and double dates.
- Multiple body-type preferences.
- Multiple attractive-trait choices.
- Better profile-name/session recovery for accounts whose profile row is missing or has a blank name.
- Photo uploads without createImageBitmap/canvas conversion, which avoids Android WebView upload failures on unsupported image formats.
- Multiple profile photos with delete support.
- Video uploads using the original file and a safer upload ID fallback.
- Existing video moderation flow is preserved.
- Existing LT logo resources are included.
