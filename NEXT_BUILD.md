# Next Build Plan

1. Add third-party age assurance and verification callbacks.
2. Add moderator dashboard and audit trail.
3. Add image/content moderation and abuse/rate-limit controls.
4. Replace safety contact and legal placeholders.
5. Configure production email and push notifications.
6. Run security tests against the live Supabase project.
7. Install dependencies on a normal developer/CI machine and run `npm run build`.
8. Run `npx cap sync`, then produce signed Android and iOS release builds.
9. Complete Apple App Store and Google Play declarations.

## Age assurance and automated moderation

The app now includes a provider-neutral age-assurance adapter. Configure these Supabase secrets before production use:
- `AGE_ASSURANCE_PROVIDER`
- `AGE_ASSURANCE_API_URL`
- `AGE_ASSURANCE_API_KEY`
- `AGE_ASSURANCE_RETURN_URL`
- `AGE_ASSURANCE_WEBHOOK_SECRET`

The provider must return a hosted verification URL from the start endpoint and call the webhook with an HMAC-SHA256 signature in `x-age-assurance-signature`. The webhook accepts `verified`, `approved`, `rejected`, `failed`, and `expired` statuses.

Automated moderation now scores obvious child-safety, scam, threat and sexual-content-request signals in messages and queues elevated/high/critical items for moderation. This is a conservative first-line screen, not a substitute for specialist CSAM/sexual-content detection. A production deployment should add an image/content moderation provider and retain an auditable human-review process.

## Final release hardening completed

- Profile-photo uploads are normalised client-side through a canvas before storage. This strips common embedded EXIF metadata by decoding and re-encoding the image as JPEG.
- Original uploads are not retained by the client upload path; only the processed JPEG is sent to the private `profile-photos` bucket.
- New profile photos continue to enter the moderation queue through the database trigger.
- The app remains blocked from treating age verification as complete until a configured age-assurance provider returns a verified result.

## Remaining release gates

These cannot be truthfully marked complete without operator-owned production inputs:

1. Configure a real age-assurance provider and its production secrets.
2. Configure an image/CSAM moderation provider and production credentials. The queue is present, but heuristic moderation is not a substitute for specialist image safety scanning.
3. Replace the child-safety contact placeholder with a monitored operator-owned address.
4. Have legal counsel/operator complete and approve the privacy policy and terms.
5. Create the first admin user in `admin_users` after the operator's Auth account exists.
6. Run `npm ci` and `npm run build` in a normal CI/developer environment, then `npx cap sync`.
7. Produce signed Android/iOS release builds and test on physical devices.
8. Complete Apple App Store and Google Play declarations, including Google's Restrict Minor Access configuration for a dating app.

Supabase production secrets must be stored in Edge Function secrets, never in the mobile bundle.
