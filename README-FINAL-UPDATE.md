# love that — final update

This ZIP contains the updated app source and the backend migration for the problems reported in the current testing round.

## Included
- Easier first signup: name, date of birth, email and password only.
- Date of birth is used to calculate age and enforce 18+.
- Full multi-step About You onboarding after account creation.
- Full What Are You Looking For onboarding and partner preferences.
- Home-screen love that logo.
- Browser/PWA logo and Android app-icon configuration.
- Profile photo and bio/Shorts video upload support.
- Shorts upload and feed support (videos up to 60 seconds).
- Chat room support and `public.chat_room` compatibility table.
- Speed Dating (Saturday/Sunday, 8:00–8:30pm UK time, two-minute rounds).
- Date Night mutual matching and 8:00pm UK video-date scheduling.
- Back/Home navigation on feature screens.
- Android manifest validation and icon/media-permission steps in CI.
- `save_my_profile` Supabase RPC to avoid the profile onboarding RLS error.

## Important
The migration file is included at `supabase/migrations/20261002_love_that_final_fixes.sql` and is also designed to be applied to the existing `meet` Supabase project. Do not put a Supabase service-role/secret key in the frontend.

If the existing repository already contains a working `src/lib/supabase.js` with your publishable key, keep that file when merging this update. Otherwise set `VITE_SUPABASE_ANON_KEY` in the build environment.
