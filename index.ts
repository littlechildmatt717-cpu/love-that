// Called by database triggers (see migration). Deploy with --no-verify-jwt; protected by x-webhook-secret.
import { admin, nameOf, sendPush } from "../_shared/fcm.ts";

const SECRET = Deno.env.get("WEBHOOK_SECRET")!;

Deno.serve(async (req) => {
  if (req.headers.get("x-webhook-secret") !== SECRET) return new Response("forbidden", { status: 403 });
  const { type, table, record: r, old_record: old } = await req.json();

  try {
    // 💬 Messages (text now; photos/videos once they pass safety review)
    if (table === "messages") {
      const justApproved = type === "UPDATE" && r.media_path && r.media_status === "approved" && old?.media_status !== "approved";
      const isText = type === "INSERT" && !r.media_path && r.body;
      if (!justApproved && !isText) return new Response("skip");
      const { data: c } = await admin.from("conversations").select("user_a,user_b").eq("id", r.conversation_id).maybeSingle();
      if (!c) return new Response("no convo");
      const to = c.user_a === r.sender_id ? c.user_b : c.user_a;
      const body = isText
        ? String(r.body).slice(0, 100)
        : r.media_type === "video" ? "Sent you a video" : "Sent you a photo";
      await sendPush(to, {
        title: `💬 ${await nameOf(r.sender_id)}`, body, channelId: "general",
        data: { type: "message", conversationId: String(r.conversation_id) },
      });
    }

    // ❤️ Short likes
    if (table === "short_likes" && type === "INSERT") {
      const { data: v } = await admin.from("short_videos").select("user_id").eq("id", r.video_id).maybeSingle();
      if (v && v.user_id !== r.user_id)
        await sendPush(v.user_id, {
          title: `❤️ ${await nameOf(r.user_id)} loved your Short`, body: "", channelId: "general",
          data: { type: "short_like", videoId: String(r.video_id) },
        });
    }

    // 💬 Short comments
    if (table === "short_comments" && type === "INSERT") {
      const { data: v } = await admin.from("short_videos").select("user_id").eq("id", r.video_id).maybeSingle();
      if (v && v.user_id !== r.user_id)
        await sendPush(v.user_id, {
          title: `💬 ${await nameOf(r.user_id)} commented on your Short`,
          body: String(r.body ?? "").slice(0, 100), channelId: "general",
          data: { type: "short_comment", videoId: String(r.video_id) },
        });
    }

    // 💘 Mutual likes (new row in matches)
    if (table === "matches" && type === "INSERT") {
      const [na, nb] = await Promise.all([nameOf(r.user_a), nameOf(r.user_b)]);
      await Promise.all([
        sendPush(r.user_a, { title: "💘 It's mutual!", body: `You and ${nb} liked each other`, channelId: "matches", data: { type: "match", userId: String(r.user_b) } }),
        sendPush(r.user_b, { title: "💘 It's mutual!", body: `You and ${na} liked each other`, channelId: "matches", data: { type: "match", userId: String(r.user_a) } }),
      ]);
    }

    // ❤️ Likes — needs your likes table; see SETUP.md step 6.
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
  return new Response("ok");
});
