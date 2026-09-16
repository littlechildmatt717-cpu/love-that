# love that — Store Submission Checklist

## Current build status

The love that project is connected to the live Supabase project and has active Edge Functions for likes, messages, reporting, account deletion, photo URLs and conversations. The client uses a Supabase publishable key; no secret key should ever be placed in the mobile app.

Supabase currently documents publishable keys as safe for shipped browser/mobile code when Row Level Security is correctly configured, while secret keys must remain server-side. The current Edge Functions are deployed with JWT verification enabled.

## Completed in this project

- 18+ entry gate
- Date-of-birth collection at account creation
- Database enforcement preventing under-18 profiles
- Singles, Couples, Friend Zone and After Dark modes
- After Dark locked until stronger age verification is completed
- Supabase Auth with persistent sessions
- Live profiles and discovery
- Likes and reciprocal matches
- Conversations and realtime messages
- Private profile-photo bucket and signed photo URLs
- Report and block controls
- Safety feedback mechanism
- Community Standards page
- Child Safety Standards page
- In-app account deletion
- External account-deletion page
- Moderation queue database tables/triggers
- Age-assurance request table
- Child-safety incident table

## Required before public store submission

### 1. Real age assurance

The current date-of-birth check is not sufficient by itself for a production dating service. Integrate a suitable age-assurance provider and connect successful verification to `profiles.age_verification_status = 'verified'` before enabling After Dark.

### 2. Child-safety contact

Replace the placeholder in `public/child-safety.html` with a real, monitored child-safety contact address owned by the operator. Do not publish the app until this is done.

### 3. Moderation operations

Build an authenticated moderator/admin workflow for:

- moderation queue review
- report triage
- profile/photo review
- account suspension/ban
- child-safety escalation
- audit logging
- evidence retention and access control

### 4. Automated moderation

Add image/content scanning, EXIF stripping where appropriate, spam/bot detection, rate limiting and abuse monitoring. Keep a human escalation route for high-risk reports.

### 5. Legal documents

Replace the placeholder privacy policy and terms with legally reviewed documents covering the actual product, including data collection, messages, photos, moderation, retention, deletion, processors, international transfers and contact information.

### 6. Google Play configuration

Configure the Play Console age/minor restrictions required for dating/matchmaking applications and complete the Data Safety and child-safety declarations.

### 7. Apple configuration

Complete App Store privacy information, account-deletion configuration, support/contact information and the UGC safety requirements, including reporting and blocking.

### 8. Production services

Configure production email/SMTP, push notifications, crash reporting, analytics only where appropriate and incident monitoring.

### 9. Security testing

Before release, test RLS, authentication, account deletion, blocked-user access, report abuse, photo access, realtime channels, rate limits and Edge Functions with both authenticated and unauthenticated requests.

### 10. Release builds

Android requires a signed release build and Play Console signing configuration. iOS requires macOS/Xcode and Apple Developer signing. Store screenshots, icons, descriptions and support URLs must also be prepared.

## Important build note

A clean `npm install --no-audit --no-fund` was attempted in the current environment but did not finish before the environment timeout. Therefore a successful production Vite/Capacitor build has not been claimed from this environment.

## Security rule

Never place a Supabase secret/service-role key in the React/Vite client, `.env` file intended for the mobile bundle, screenshots or source repository. The publishable key may be shipped with the app when RLS and authorization are correctly enforced.
