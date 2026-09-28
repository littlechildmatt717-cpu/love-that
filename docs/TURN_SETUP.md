# TURN setup for love that

Private audio/video calls use WebRTC. Release 12 now requests short-lived TURN credentials from the Supabase `turn-credentials` Edge Function. The function keeps Twilio credentials server-side and returns ephemeral ICE servers to the client.

## Configure Supabase secrets

Set these Edge Function secrets in the `meet` Supabase project:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_API_KEY_SID`
- `TWILIO_API_KEY_SECRET`

Do **not** put these values in the React app, `.env`, GitHub source, or a public config file.

Twilio's Network Traversal Service issues short-lived credentials and ICE server URLs specifically for WebRTC clients. The implementation requests a 1-hour token. See the official Twilio documentation: https://www.twilio.com/docs/stun-turn/api

## Recommended Twilio setup

Create a Standard API Key for the Twilio account and use its SID/secret for the Edge Function. Keep the key dedicated to this application and rotate/revoke it if compromised.

## Behaviour

If TURN is configured, calls use the returned STUN/TURN servers, including TCP/TLS fallback where supplied by Twilio. If TURN is temporarily unavailable, the app falls back to Google's public STUN server so development calls can still work.

## Production test

Test at minimum:

1. Android on mobile data -> iOS/Android on Wi-Fi.
2. Wi-Fi -> mobile data.
3. Two different Wi-Fi networks.
4. Audio call and video call.
5. Call setup, mute, camera toggle, and hang-up.
6. Speed-dating video calls.
7. A restrictive/NAT-heavy network where direct peer connectivity is unlikely.

The application should not be considered production-ready for calling until these tests pass on physical devices.
