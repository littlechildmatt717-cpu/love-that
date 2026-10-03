// Admin-only. Lists reported pictures/videos and lets a moderator block the content and the person's account.
// Admin check re-uses your existing admin-console function, so "who is an admin" stays defined in one place.
import { createClient } from "npm:@supabase/supabase-js@2";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function adminUserId(jwt: string): Promise<string | null> {
  const { data } = await admin.auth.getUser(jwt);
  if (!data?.user) return null;
  const r = await fetch(`${URL_}/functions/v1/admin-console`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}`, apikey: Deno.env.get("SUPABASE_ANON_KEY")!, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "dashboard" }),
  });
  if (!r.ok) return null;
  const j = await r.json().catch(() => null);
  return j?.ok === true ? data.user.id : null;
}

// Find the stored file for a reported item.
async function evidenceFor(type: string, id: string) {
  if (type === "message") {
    const { data } = await admin.from("messages").select("media_path,media_type").eq("id", id).maybeSingle();
    return data?.media_path ? { bucket: "private-chat", path: data.media_path, video: data.media_type === "video" } : null;
  }
  const { data } = await admin.from("short_videos").select("storage_path").eq("id", id).maybeSingle();
  return data?.storage_path ? { bucket: "short-videos", path: data.storage_path, video: true } : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const me = await adminUserId((req.headers.get("Authorization") ?? "").replace("Bearer ", ""));
  if (!me) return json({ error: "Moderators only" }, 403);
  const body = await req.json().catch(() => ({}));

  if (body.action === "list") {
    const { data: rows } = await admin.from("media_reports").select("*").eq("status", "open")
      .order("created_at", { ascending: false }).limit(50);
    const reports = [];
    for (const r of rows ?? []) {
      const [{ data: p }, { count }, ev] = await Promise.all([
        admin.from("profiles").select("display_name").eq("id", r.reported_user_id).maybeSingle(),
        admin.from("media_reports").select("id", { count: "exact", head: true }).eq("reported_user_id", r.reported_user_id).eq("status", "open"),
        evidenceFor(r.content_type, r.content_id),
      ]);
      let url: string | null = null;
      const bucket = ev?.bucket ?? r.evidence_bucket, path = ev?.path ?? r.evidence_path;
      if (bucket && path) url = (await admin.storage.from(bucket).createSignedUrl(path, 3600)).data?.signedUrl ?? null;
      reports.push({
        id: r.id, content_type: r.content_type, reason: r.reason, reported_name: p?.display_name ?? "Member",
        user_report_count: count ?? 1, url, is_video: ev?.video ?? false,
      });
    }
    return json({ reports });
  }

  const { data: rep } = await admin.from("media_reports").select("*").eq("id", body.report_id).maybeSingle();
  if (!rep) return json({ error: "Report not found" }, 404);
  const now = new Date().toISOString();

  if (body.action === "dismiss") {
    await admin.from("media_reports").update({ status: "dismissed", action: "dismissed", handled_by: me, handled_at: now }).eq("id", rep.id);
    return json({ ok: true });
  }

  if (body.action === "block") {
    const uid = rep.reported_user_id;
    // keep a pointer to the evidence (files stay in storage; nothing is purged)
    const ev = await evidenceFor(rep.content_type, rep.content_id);
    if (ev) await admin.from("media_reports").update({ evidence_bucket: ev.bucket, evidence_path: ev.path }).eq("id", rep.id);

    // 1. block the reported content and all of this person's chat media
    await admin.from("messages").update({ media_status: "rejected" }).eq("sender_id", uid).not("media_path", "is", null);
    // 2. take down all of this person's Shorts (the files stay in storage)
    await admin.from("short_videos").delete().eq("user_id", uid);
    // 3. block the account: hide the profile and refuse sign-in
    await admin.from("profiles").update({ is_active: false }).eq("id", uid);
    await admin.auth.admin.updateUserById(uid, { ban_duration: "876000h" });
    // 4. close every open report about this person
    await admin.from("media_reports").update({ status: "actioned", action: "blocked_user", handled_by: me, handled_at: now })
      .eq("reported_user_id", uid).eq("status", "open");
    return json({ ok: true });
  }
  return json({ error: "Unknown action" }, 400);
});
