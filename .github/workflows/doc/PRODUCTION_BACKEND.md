# Production backend contract

Recommended architecture: managed authentication + PostgreSQL database + object storage + realtime messaging + server-side moderation/notifications.

Core entities:
users, profiles, profile_photos, preferences, likes, passes, matches, conversations, messages, blocks, reports, moderation_actions, devices, notification_tokens, legal_consents.

Security:
- Never trust client-supplied age, match eligibility, moderation state or user ownership.
- Authorise every profile/message/report operation server-side.
- Store images privately and serve short-lived signed URLs.
- Rate-limit likes, messages, reports and account creation.
- Log moderation actions and security events.
- Minimise personal data and support complete account/data deletion.
