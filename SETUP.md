# Setup — do these in order

## 1. Replace files in your repo
- `main.jsx` → `src/main.jsx`
- `Gradle1.yml` → your workflow file (`.github/workflows/…`)
- `supabase/functions/_shared`, `notify-call`, `push-notify` → same paths in your repo

## 2. Add the push plugin
Add `@capacitor/push-notifications` to package.json (same major version as your `@capacitor/core`), commit package-lock.json too.

## 3. GitHub secret
Repo → Settings → Secrets → Actions → new secret `GOOGLE_SERVICES_JSON_BASE64`:
the base64 of your google-services.json (`base64 -w0 google-services.json`, or any online base64 encoder).
The Capacitor `appId` must be `com.meetdating.app` to match that file.

## 4. Firebase service account → Supabase
Firebase console → Project settings → Service accounts → Generate new private key (project love-that).
    supabase secrets set FCM_SERVICE_ACCOUNT="$(cat service-account.json)"
    supabase secrets set WEBHOOK_SECRET=<any long random string>
    supabase functions deploy notify-call
    supabase functions deploy push-notify --no-verify-jwt

## 5. Database
Open `supabase/migrations/20261003_push.sql`, replace YOUR_PROJECT_REF and YOUR_WEBHOOK_SECRET, run it in the SQL editor.
It also fixes the picture "messages_body_check" error.

## 6. ❤️ Likes (one thing I can't see)
Likes go through your `like-user` function, which I haven't seen. Send me that function (or the name of the table it writes to)
and I'll add the like notification. Until then, mutual likes (💘) work.

## Already working without FCM
30-minute event reminders are scheduled on the phone itself by your existing code, so they fire even when the app is closed.

## Notes
- Android 13+ asks for notification permission on first launch after login.
- If you get two banners for one message while the app is in the background, tell me and I'll de-duplicate.
