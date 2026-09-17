# love that moderator setup

The production backend now includes an authenticated moderator dashboard and audit log.

## Add the first moderator

1. Create the owner's normal love that account.
2. In Supabase SQL Editor, find that account's UUID in `auth.users`.
3. Insert it into `public.admin_users`:

```sql
insert into public.admin_users (user_id, role, active)
values ('YOUR-AUTH-USER-UUID', 'admin', true);
```

Do not put service-role/secret keys in the app.

## Age verification

love that accepts a verification request from the user, but the current build deliberately does **not** claim that a self-declared DOB is robust age assurance. After Dark remains locked until an authorised verification review marks the request verified.

Before store submission, connect a compliant third-party age-assurance provider and have its verified callback update `age_verification_requests` server-side. Do not ask users to upload identity documents into the normal profile-photo system.

## Moderator controls

The dashboard can review:
- age-verification requests
- open reports
- moderation queue items
- child-safety incidents

Actions are recorded in `moderation_audit_log`.
