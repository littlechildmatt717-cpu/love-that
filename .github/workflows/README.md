# meet backend + security layer

This folder contains the production-oriented Supabase database schema and Edge Functions for authentication-aware matching, messaging, reporting/blocking, and account deletion.

## Security model
- Supabase Auth owns identities and sessions.
- PostgreSQL Row Level Security is enabled on every app table.
- Users can only edit their own profile and send messages as themselves.
- Conversations and matches are readable only by participants.
- Reports are private to the reporter; moderation should use a separate privileged dashboard/service role.
- Reporting immediately blocks the reported user from the reporter's account.
- Account deletion removes the auth user; foreign keys cascade app data.
- Service-role credentials are used only server-side in Edge Functions and must never be shipped in the app.
- Matching is reciprocal rather than the prototype's unilateral demo match.

## Deployment
1. Create a Supabase project.
2. Run `schema.sql` in the SQL editor/migration system.
3. Deploy the four Edge Functions.
4. Set `SUPABASE_SERVICE_ROLE_KEY` as a server-side secret for `delete-account` only.
5. Put only `VITE_SUPABASE_URL` and the public anon key in the mobile/web app environment.
6. Configure Auth providers, email verification, rate limits, storage buckets, and abuse monitoring before public launch.

Do not commit `.env` files or service-role keys.
