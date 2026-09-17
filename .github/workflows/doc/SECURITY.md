# love that security checklist

## Implemented in this package
- Auth-backed UUID identities via Supabase Auth.
- 18+ database constraint on profiles.
- RLS on profiles, likes, blocks, matches, conversations, messages, reports and platform membership.
- Reciprocal matching and block checks in the match function.
- Message ownership and conversation-participant checks.
- 2,000-character message limit and 2,000-character report-detail limit.
- Immediate block when reporting a user.
- Server-side account deletion using the Supabase service role.
- No service-role key in client code.
- Database indexes for common feed/chat/moderation queries.

## Still required before a real public launch
- Real age assurance / minor-access restriction appropriate for Apple and Google Play.
- Human + automated moderation and a CSAM/child-safety response process.
- Image upload scanning, EXIF stripping, size/type limits and private storage policies.
- Rate limiting / bot detection / CAPTCHA where appropriate.
- Email verification and account recovery.
- Push notification infrastructure.
- Admin moderation dashboard with audit logging and least-privilege roles.
- Privacy-policy/data-retention review and UK GDPR compliance review.
- Security testing, dependency auditing, backup/restore testing and incident-response plan.
- Store-specific declarations, screenshots, support contact and deletion URL/process.

## Store safety layer

The live project now includes age-verification state, a moderation queue for profiles/photos, safety feedback, child-safety incident reporting, stronger 18+ checks, blocking/reporting, and an external account-deletion page.

Important: a production age-verification provider is still required before enabling After Dark. The database intentionally keeps After Dark locked unless `age_verification_status = verified`.

A real monitored child-safety contact email must be configured before App Store/Google Play submission. Do not publish the placeholder in `public/child-safety.html`.
