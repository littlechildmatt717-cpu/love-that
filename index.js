// Firebase Cloud Functions (v2) – sends FCM pushes. Node 20.
// NOTE: collection/field names below are ASSUMPTIONS – adjust to your schema.
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

async function getUser(uid) {
  const s = await db.doc(`users/${uid}`).get();
  return s.exists ? { id: uid, ...s.data() } : null;
}

async function push(uid, { title, body, channelId, data = {} }) {
  const user = await getUser(uid);
  const tokens = user?.fcmTokens || [];
  if (!tokens.length) return;
  const res = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: { channelId, ...data },
    android: { priority: "high", notification: { channelId } },
  });
  // prune dead tokens
  const dead = [];
  res.responses.forEach((r, i) => {
    const c = r.error?.code;
    if (c === "messaging/registration-token-not-registered" ||
        c === "messaging/invalid-registration-token") dead.push(tokens[i]);
  });
  if (dead.length)
    await db.doc(`users/${uid}`).update({ fcmTokens: admin.firestore.FieldValue.arrayRemove(...dead) });
}

const nameOf = async (uid) => (await getUser(uid))?.name || "Someone";

// ❤️ Likes + 💘 Mutual likes   — likes/{id}: { fromUid, toUid }
exports.onLike = onDocumentCreated("likes/{id}", async (e) => {
  const { fromUid, toUid } = e.data.data();
  const name = await nameOf(fromUid);
  const reverse = await db.collection("likes")
    .where("fromUid", "==", toUid).where("toUid", "==", fromUid).limit(1).get();

  if (!reverse.empty) {
    const n2 = await nameOf(toUid);
    await Promise.all([
      push(toUid,   { title: "💘 It's a match!", body: `You and ${name} liked each other`,
                      channelId: "matches", data: { type: "match", uid: fromUid } }),
      push(fromUid, { title: "💘 It's a match!", body: `You and ${n2} liked each other`,
                      channelId: "matches", data: { type: "match", uid: toUid } }),
    ]);
  } else {
    await push(toUid, { title: "❤️ New like", body: `${name} liked you`,
                        channelId: "likes", data: { type: "like", uid: fromUid } });
  }
});

// 💬 Messages — chats/{chatId}/messages/{id}: { senderId, text }; chats/{chatId}: { participants: [] }
exports.onMessage = onDocumentCreated("chats/{chatId}/messages/{id}", async (e) => {
  const { senderId, text } = e.data.data();
  const chat = await db.doc(`chats/${e.params.chatId}`).get();
  const name = await nameOf(senderId);
  const others = (chat.data()?.participants || []).filter((u) => u !== senderId);
  await Promise.all(others.map((u) => push(u, {
    title: `💬 ${name}`, body: (text || "Sent you a message").slice(0, 120),
    channelId: "messages", data: { type: "message", chatId: e.params.chatId },
  })));
});

// ❤️ Short likes — shorts/{shortId}/likes/{id}: { userId }; shorts/{shortId}: { ownerId }
exports.onShortLike = onDocumentCreated("shorts/{shortId}/likes/{id}", async (e) => {
  const { userId } = e.data.data();
  const short = await db.doc(`shorts/${e.params.shortId}`).get();
  const owner = short.data()?.ownerId;
  if (!owner || owner === userId) return;
  await push(owner, { title: "❤️ Short liked", body: `${await nameOf(userId)} liked your short`,
                      channelId: "shorts", data: { type: "short_like", shortId: e.params.shortId } });
});

// 💬 Short comments — shorts/{shortId}/comments/{id}: { userId, text }
exports.onShortComment = onDocumentCreated("shorts/{shortId}/comments/{id}", async (e) => {
  const { userId, text } = e.data.data();
  const short = await db.doc(`shorts/${e.params.shortId}`).get();
  const owner = short.data()?.ownerId;
  if (!owner || owner === userId) return;
  await push(owner, { title: `💬 ${await nameOf(userId)} commented`, body: (text || "").slice(0, 120),
                      channelId: "shorts", data: { type: "short_comment", shortId: e.params.shortId } });
});

// ⏰ 30-minute event reminders — events/{id}: { title, startTime: Timestamp, attendees: [], reminderSent }
exports.eventReminders = onSchedule("every 1 minutes", async () => {
  const now = Date.now();
  const snap = await db.collection("events")
    .where("reminderSent", "==", false)
    .where("startTime", ">", admin.firestore.Timestamp.fromMillis(now))
    .where("startTime", "<=", admin.firestore.Timestamp.fromMillis(now + 30 * 60 * 1000))
    .get();
  await Promise.all(snap.docs.map(async (doc) => {
    const ev = doc.data();
    await doc.ref.update({ reminderSent: true });
    await Promise.all((ev.attendees || []).map((u) => push(u, {
      title: "⏰ Starting in 30 minutes", body: ev.title || "Your event",
      channelId: "events", data: { type: "event", eventId: doc.id },
    })));
  }));
});
