import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Call once after login. onCall fires when the user taps an incoming-call notification
 *  (or receives one while the app is open) — navigate to your call screen with callId. */
export async function registerPush(
  supabase: SupabaseClient,
  userId: string,
  onCall: (p: { callId: string; callerId: string; callType: string }) => void,
) {
  if (!Capacitor.isNativePlatform()) return;

  await PushNotifications.createChannel({
    id: "calls", name: "Incoming calls", importance: 5, visibility: 1, vibration: true,
  });
  // add more channels here later (messages, likes, ...) using the same call

  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === "prompt") perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return;

  await PushNotifications.removeAllListeners();

  PushNotifications.addListener("registration", async ({ value }) => {
    await supabase.from("device_tokens").upsert(
      { token: value, user_id: userId, platform: "android", updated_at: new Date().toISOString() },
      { onConflict: "token" },
    );
    localStorage.setItem("fcm_token", value);
  });
  PushNotifications.addListener("registrationError", (e) => console.error("FCM registration error", e));

  const handle = (data: Record<string, string>) => {
    if (data?.type === "call") onCall({ callId: data.callId, callerId: data.callerId, callType: data.callType });
  };
  PushNotifications.addListener("pushNotificationReceived", (n) => handle(n.data));
  PushNotifications.addListener("pushNotificationActionPerformed", (a) => handle(a.notification.data));

  await PushNotifications.register();
}

/** Call on logout, before signing out. */
export async function unregisterPush(supabase: SupabaseClient) {
  const token = localStorage.getItem("fcm_token");
  if (token) await supabase.from("device_tokens").delete().eq("token", token);
  localStorage.removeItem("fcm_token");
}
