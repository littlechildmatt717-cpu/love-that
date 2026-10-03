// Called by a Supabase Database Webhook on INSERT into public.calls.
// ASSUMED columns: calls(id, caller_id, callee_id, type). profiles(id, name). Adjust below.
import { createClient } from "npm:@supabase/supabase-js@2";
import { SignJWT, importPKCS8 } from "npm:jose@5";

const sa = JSON.parse(Deno.env.get("FCM_SERVICE_ACCOUNT")!);
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET")!;
const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function fcmAccessToken(): Promise<string> {
  const key = await importPKCS8(sa.private_key, "RS256");
  const jwt = await new SignJWT({ scope: "https://www.googleapis.com/auth/firebase.messaging" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(sa.client_email).setSubject(sa.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt().setExpirationTime("55m").sign(key);
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  return (await r.json()).access_token;
}

Deno.serve(async (req) => {
  if (req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) return new Response("forbidden", { status: 403 });

  const { record } = await req.json();
  const { id, caller_id, callee_id, type } = record;

  const [{ data: caller }, { data: tokens }] = await Promise.all([
    admin.from("profiles").select("name").eq("id", caller_id).maybeSingle(),
    admin.from("device_tokens").select("token").eq("user_id", callee_id),
  ]);
  if (!tokens?.length) return new Response("no tokens");

  const access = await fcmAccessToken();
  const name = caller?.name ?? "Someone";
  const kind = type === "video" ? "video" : "audio";

  for (const { token } of tokens) {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: `📞 ${name} is calling`, body: `Incoming ${kind} call` },
          data: { type: "call", callId: String(id), callerId: String(caller_id), callType: kind },
          android: {
            priority: "HIGH",
            ttl: "30s",
            notification: { channel_id: "calls", sound: "default", default_vibrate_timings: "true" },
          },
        },
      }),
    });
    if (res.status === 404 || res.status === 400) {
      const err = await res.text();
      if (err.includes("UNREGISTERED") || err.includes("INVALID_ARGUMENT"))
        await admin.from("device_tokens").delete().eq("token", token);
    }
  }
  return new Response("ok");
});
