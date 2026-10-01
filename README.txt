love that - video upload fix

Replace:
  src/main.jsx

with:
  main.jsx

This update keeps the existing profile/photo/Shorts functionality and changes video uploads so that:
- the normal Supabase Storage upload is tried first;
- if Android reports "Failed to fetch" / a network fetch failure, the upload automatically retries using a direct XMLHttpRequest to Supabase Storage;
- upload progress is shown;
- the user gets clearer network/storage errors instead of the generic "Failed to fetch" message;
- videos remain limited to 60 seconds and 100 MB.

IMPORTANT:
If the retry reports an HTTP 401/403/404/409 error, that indicates a Supabase configuration/policy/bucket problem rather than an Android upload transport problem. In that case the exact HTTP error shown by the app can be used to fix the Supabase Storage bucket or RLS policy.

For Shorts, MP4/H.264 is recommended for the widest phone playback compatibility. MOV/HEVC files may upload successfully but can still be unsupported by some Android browsers/devices when played back.
