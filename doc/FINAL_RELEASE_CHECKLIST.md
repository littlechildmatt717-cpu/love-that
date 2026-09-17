# love that — Final Release Checklist

## Backend
- [x] Supabase production project connected
- [x] RLS enabled on core user-data tables
- [x] Authenticated Edge Functions deployed
- [x] Account deletion function deployed
- [x] Report/block controls implemented
- [x] Moderator dashboard function deployed
- [x] Age verification start/webhook functions deployed
- [x] New profile photos queued for moderation
- [x] Message/report first-line automated risk screening
- [ ] Production age-assurance provider configured (Yoti integration deployed; credentials and end-to-end production test still required)
- [ ] Production image/CSAM scanning provider configured
- [ ] Production SMTP/email configured
- [ ] Rate limiting/CAPTCHA/anti-bot controls validated
- [ ] Security penetration test completed

## Mobile
- [x] 18+ gate
- [x] After Dark locked until verified
- [x] Account deletion in app
- [x] External account deletion page
- [x] Report and block controls
- [x] Safety feedback
- [x] Community Standards
- [x] Child Safety Standards
- [x] Profile image EXIF-reducing re-encode before upload
- [ ] `npm ci` successful in CI
- [ ] `npm run build` successful
- [ ] `npx cap sync` successful
- [ ] Android release APK/AAB signed and tested
- [ ] iOS archive signed and tested on device

## Store submission
- [x] Real support/child-safety email published in public child-safety materials
- [ ] Privacy policy legally reviewed and finalised
- [ ] Terms legally reviewed and finalised
- [ ] Apple UGC moderation/contact requirements verified
- [ ] Google Play Restrict Minor Access enabled/configured
- [ ] Google child-safety declarations completed
- [ ] Data Safety form completed
- [ ] App screenshots, icon and store listing finalised
- [ ] Review/demo account prepared

## Important
Do not describe love that as fully store-ready until all unchecked release gates above have been completed.

## Operator contact supplied
- [x] Child-safety contact email supplied by operator: Mpl.87@outlook.com

## Age verification — final production test readiness

**Operator update:** Yoti secret configuration has been started. The production release gate remains open until the complete secret set, Yoti Hub notification URL, callback URL, and end-to-end pass/fail tests are verified.
- [x] Yoti Age Verification integration deployed (`start-age-verification` and `age-verification-webhook`)
- [x] love that requires a verified age-assurance result before After Dark can be unlocked
- [x] Yoti production configuration documented without placing private credentials in the app
- [x] Yoti webhook signature validation is implemented
- [ ] Yoti production credentials configured in Supabase Edge Function secrets (`AGE_ASSURANCE_PROVIDER`, `YOTI_SDK_ID`, `YOTI_AGE_API_KEY`, `YOTI_NOTIFICATION_URL`, `AGE_ASSURANCE_RETURN_URL`)
- [ ] Yoti notification/webhook URL configured in Yoti Hub: `https://igsucrszgotwrifbrvxd.supabase.co/functions/v1/age-verification-webhook`
- [ ] Production return/callback URL configured and reachable
- [ ] End-to-end test: signed-in adult starts verification and reaches Yoti
- [ ] End-to-end test: successful 18+ result changes love that profile to `age_verification_status=verified`
- [ ] End-to-end test: After Dark unlocks only after verified status
- [ ] End-to-end test: failed/rejected verification does not unlock After Dark
- [ ] End-to-end test: webhook signature failure is rejected and does not change verification status
- [ ] Production verification evidence recorded for release QA

### Final production age-verification test procedure
1. Configure `AGE_ASSURANCE_PROVIDER=yoti`, `YOTI_SDK_ID`, `YOTI_AGE_API_KEY`, `YOTI_NOTIFICATION_URL`, and `AGE_ASSURANCE_RETURN_URL` as Supabase Edge Function secrets. `YOTI_WEBHOOK_SECRET` is not required by the current Yoti implementation because the webhook validates Yoti's signed notification using Yoti's public key.
2. Confirm the required Yoti secrets are present in Supabase Edge Function secrets. Configure the matching notification URL in Yoti Hub. Do not place the Yoti API key in the mobile app or source repository. The notification URL is `https://igsucrszgotwrifbrvxd.supabase.co/functions/v1/age-verification-webhook`.
3. Sign in to love that with a test adult account and open Settings → Verify my age.
4. Complete the Yoti verification flow and return to love that.
5. Confirm the corresponding `age_verification_requests` row is updated to `verified` and the user's profile has `age_verification_status=verified`.
6. Confirm After Dark becomes available only after the verified state is recorded.
7. Repeat with a failed/rejected Yoti outcome and confirm After Dark remains locked.
8. Send a deliberately invalid webhook signature in a controlled test and confirm the webhook returns HTTP 401 and makes no database change.
9. Record the date, environment, test account, verification outcome, and evidence in the release QA record.

**Release gate:** Do not mark the production age-assurance provider requirement complete until the successful and failed end-to-end tests above have passed.

## Age verification — operator update
- [x] Operator reports Yoti secret configuration has been added/started
- [ ] Verify all required secret names/values are present without exposing secret values
- [ ] Complete Yoti Hub notification URL configuration
- [ ] Complete live 18+ pass/fail test and After Dark gating test


## Shorts / video feature — release gate
- [x] App branding changed from Meet to love that (mobile display name; existing Android package ID retained for continuity)
- [x] Shorts feed supports videos up to 60 seconds
- [x] Profile supports a short bio video up to 60 seconds
- [x] Approved bio videos are mixed into the Shorts feed
- [x] Shorts include a private-chat action
- [x] Short videos use private storage and signed playback URLs
- [x] New videos enter the existing moderator queue before publication
- [ ] Production video moderation / CSAM scanning provider configured and tested
- [ ] Production video upload/playback tested on Android and iOS devices
- [ ] Store metadata, screenshots and legal documents updated for user-generated video
