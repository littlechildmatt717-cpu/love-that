# love that — Yoti production age-verification test

## Production endpoints
- Notification/webhook URL: `https://igsucrszgotwrifbrvxd.supabase.co/functions/v1/age-verification-webhook`
- Start function: `https://igsucrszgotwrifbrvxd.supabase.co/functions/v1/start-age-verification`

## Required Edge Function secrets
- `AGE_ASSURANCE_PROVIDER=yoti`
- `YOTI_SDK_ID`
- `YOTI_AGE_API_KEY`
- `YOTI_NOTIFICATION_URL=https://igsucrszgotwrifbrvxd.supabase.co/functions/v1/age-verification-webhook`
- `AGE_ASSURANCE_RETURN_URL` — a real HTTPS URL that returns the user to the love that app/web experience after Yoti.

The current webhook validates Yoti notifications using Yoti's published RSA public key. A separate `YOTI_WEBHOOK_SECRET` is not required by this implementation.

## Test sequence
1. Confirm the Yoti service is active and using a dedicated production API key.
2. Confirm the notification URL above is configured in Yoti Hub.
3. Sign in to a love that test account that is already allowed through the love that 18+ gate.
4. Open Settings → Verify my age.
5. Start verification and complete the Yoti flow.
6. Confirm the Yoti notification reaches the webhook and the related `age_verification_requests` row becomes `verified`.
7. Confirm the user's `profiles.age_verification_status` becomes `verified`.
8. Confirm After Dark becomes unlocked only after the verified profile state is recorded.
9. Test a rejected/failed verification and confirm After Dark remains locked.
10. Test an invalid Yoti signature in a controlled environment and confirm the webhook returns HTTP 401 without changing verification state.

## Release gate
Do not mark age verification as production-complete until the successful pass, failed/rejected case, and invalid-signature security case have all passed.
