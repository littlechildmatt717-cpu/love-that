# Love That — profile signup/RLS fix

The mobile signup flow has been changed so it **does not try to insert into `profiles` immediately after `supabase.auth.signUp()`**. This matters when email confirmation is enabled because the auth user can exist before an authenticated session exists.

The user's name and date of birth are temporarily kept in `sessionStorage`. The profile is created/updated from the authenticated onboarding screen instead.

## One required Supabase step

Run the SQL in:

`supabase/fix_profiles_rls.sql`

in the Supabase SQL Editor for the Love That project.

It adds the required policies so an authenticated user can:

- INSERT their own profile (`auth.uid() = id`)
- SELECT their own profile
- UPDATE their own profile

Do this once. You do **not** need to put Supabase service-role keys into the app.

## GitHub upload

Replace your existing `src/main.jsx` and `src/styles.css` with the versions in this ZIP. Keep your existing `src/lib/supabase.js` (or `src/lib/supabase` file) because it contains your project connection settings.

The logo is included at:

`src/assets/love-that-logo.png`
