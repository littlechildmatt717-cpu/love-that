# love that — production backend-connected mobile app foundation

love that is a React + Vite + Capacitor dating/social app connected to a live Supabase backend.

## Live backend

- Supabase project: `meet`
- Region: EU West (London)
- Project ref: `igsucrszgotwrifbrvxd`
- Client uses the Supabase publishable key only. No service/secret key is shipped in the app.

## Backend implemented

- Supabase Auth with persistent sessions
- Automatic profile creation on signup
- PostgreSQL profiles, photos, likes, matches, blocks, reports, conversations and messages
- Row Level Security on core application tables
- Reciprocal matching: a match is created only after both users like each other
- Canonical unique constraints for matches and conversations
- Private profile-photo bucket with owner-only upload/update/delete policies
- Short-lived signed photo URLs through an authenticated Edge Function
- Authenticated Edge Functions for liking, messaging, reporting, conversation creation and account deletion
- Realtime message and match publication enabled
- Moderation status and age-verification fields prepared for production safety workflows
- Database security advisor currently clean

## Edge Functions

- `like-user`
- `send-message`
- `report-user`
- `delete-account`
- `profile-photo-url`
- `start-conversation`

All are deployed with JWT verification enabled.

## Run locally

Requires a current Node.js LTS release.

```bash
npm install
npm run dev
```

The app also contains the configured project URL and publishable key in `src/lib/supabase.js`, so a separate secret is not required for the frontend.

## Capacitor

```bash
npm run cap:sync
npm run cap:android
npm run cap:ios
```

Android/iOS native builds still require the platform SDK/toolchain and signing credentials.

## Important production work still required before store submission

This is now a real backend-connected foundation, but a dating app should not be submitted to the stores until the operational safety layer is completed. In particular:

1. Robust age assurance rather than relying only on an 18+ declaration.
2. Human/automated moderation workflows for reports and uploaded images.
3. A child-safety programme, escalation process and point of contact.
4. Custom production SMTP for authentication email.
5. Final privacy policy, terms, community guidelines and data-retention policy.
6. Store-specific account deletion/privacy disclosures.
7. Push notifications.
8. Production photo/content scanning and abuse-rate controls.
9. Admin moderation dashboard.
10. Signed release builds and store metadata.

Do not put a Supabase service/secret key in the frontend, mobile binary or public repository.

## Safety / store preparation

The project now includes:
- date-of-birth based 18+ onboarding;
- database-enforced adult checks;
- After Dark locked until stronger age verification is completed;
- moderation queue for profiles and profile photos;
- in-app report/block and safety feedback;
- child-safety incident table and published standards pages;
- external account deletion page;
- server-side JWT-protected functions and RLS.

Before store submission, configure a real third-party age-assurance provider, a monitored child-safety contact email, moderation operations, Play Console minor restrictions/child-safety declarations, and Apple/Google privacy/data-safety metadata.


## New: Shorts and profile video

love that now includes a Shorts feed for user videos up to 60 seconds. Users can also add one short video to their profile bio; approved bio videos are automatically included in Shorts. Each Short has a private-chat action, subject to the app's blocking and safety controls. Videos are stored privately, served through short-lived signed URLs, and enter the moderator queue before appearing publicly.

## Chat room
The home screen includes an 18+ shared Chat room with realtime messages. Members can use emojis, paste GIF/image links, share photos and upload short videos. Media is stored privately and queued for moderator review before it becomes visible to other members.

## Release 14 build-pipeline hardening

- Removed the duplicate Android camera/microphone permission configuration step.
- Android CI now runs when application, native configuration, scripts, Supabase, or workflow files change.
- CI uses `npm ci` automatically when a lockfile is present and falls back to `npm install` with an explicit warning until `package-lock.json` is committed.
- iOS and Android workflows remain simulator/debug-build oriented unless signing secrets and the native release configuration are supplied.

## Release 14 — build reproducibility

Release 14 pins the direct frontend/native dependencies to exact versions. This prevents `latest` dependency drift during CI builds. A lockfile is not yet committed because the current build environment cannot complete an npm registry install; GitHub Actions will use `npm ci` automatically once `package-lock.json` is committed and currently falls back to `npm install` with the exact package versions.
