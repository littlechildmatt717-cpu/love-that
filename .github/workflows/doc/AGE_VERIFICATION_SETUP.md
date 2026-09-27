# love that age verification — Yoti setup

love that is now wired specifically for Yoti Age Verification. The app does not store Yoti credentials.

## 1. Create the Yoti application
Create an Age Verification application in Yoti Hub and obtain:
- Yoti SDK ID
- Yoti Age Verification API key

Configure the service for an **OVER 18** check. love that requests age estimation, Digital ID and UK document verification as available methods. The flow uses a 21 threshold for age estimation as an additional safety margin and 18 for identity/document checks.

## 2. Configure Supabase Edge Function secrets
Set these secrets in the Supabase project — never in the mobile app or Git:

- `AGE_ASSURANCE_PROVIDER=yoti`
- `YOTI_SDK_ID=<your Yoti SDK ID>`
- `YOTI_AGE_API_KEY=<your Yoti Age Verification API key>`
- `YOTI_NOTIFICATION_URL=https://<project-ref>.supabase.co/functions/v1/age-verification-webhook`
- `AGE_ASSURANCE_RETURN_URL=https://<your-domain>/` (or your deployed love that web callback)

The Yoti API key must remain confidential. Supabase recommends production secrets be stored through Edge Function secret management rather than the client bundle.

## 3. Configure Yoti
In Yoti, set the notification/webhook URL to the value above. The webhook validates Yoti's signed notification before changing a love that user's verification state.

## 4. Test in Yoti Sandbox first
Use Yoti's sandbox before switching the application to production credentials. The sandbox can simulate pass/fail outcomes without performing real age checks.

## Important
This code is integrated, but **production age verification is not live until a Yoti account/application is created and the secrets above are configured**. Do not mark the release checklist's production-provider item complete until a real pass/fail test has been completed end-to-end.
