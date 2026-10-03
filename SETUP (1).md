# Incoming-call push (Capacitor + Supabase + FCM)

## 1. Install plugin
    npm i @capacitor/push-notifications

## 2. Database
Run `supabase/migrations/20261003_device_tokens.sql` (SQL editor or `supabase db push`).

## 3. Edge function
    supabase functions deploy notify-call --no-verify-jwt
    supabase secrets set WEBHOOK_SECRET=<random string>
    supabase secrets set FCM_SERVICE_ACCOUNT="$(cat service-account.json)"
Service account JSON: Firebase console → Project settings → Service accounts → Generate new private key
(project `love-that`). Never commit it.

## 4. Database webhook
Supabase dashboard → Database → Webhooks → Create:
- Table `calls`, event INSERT
- Type: Supabase Edge Function → `notify-call`
- Add HTTP header `x-webhook-secret: <same random string>`

## 5. GitHub Actions (android folder is regenerated each build)
Add repo secret `GOOGLE_SERVICES_JSON_BASE64` (`base64 -w0 google-services.json`), then add this step in
`.github/workflows/android.yml` right AFTER "Sync Capacitor Android project":

      - name: Add google-services.json
        run: echo "${{ secrets.GOOGLE_SERVICES_JSON_BASE64 }}" | base64 --decode > android/app/google-services.json

Capacitor's generated Gradle applies the Google Services plugin automatically when that file exists.
Also make sure `android.permission.POST_NOTIFICATIONS` ends up in AndroidManifest
(add it to scripts/configure-media-permissions.py if it's missing).

## 6. App code
After login: `registerPush(supabase, user.id, ({callId}) => navigate(`/call/${callId}`))`
On logout: `await unregisterPush(supabase)` before `supabase.auth.signOut()`.

## Limits
This shows a heads-up notification with sound; tapping opens the call. A full-screen ringing screen over the
lock screen needs a native call-UI plugin (e.g. a CallKit/ConnectionService plugin) — can be added later.
The call itself still needs working signaling + a TURN server.

## 7. Profile pop-up while ringing
Copy `src/components/CallProfileCard.*` into your project, then on your call screen:

    {(status === "calling" || status === "ringing") && (
      <CallProfileCard
        supabase={supabase}
        otherUserId={isCaller ? call.callee_id : call.caller_id}
        mode={isCaller ? "calling" : "incoming"}
        onHangup={endCall}
        onAnswer={answerCall}
      />
    )}

It hides itself as soon as status changes to connected. Adjust the `profiles` columns in the `select()` to match yours.
