// Confirms a PayPal order was paid (£3.99 GBP, made by this user) and adds 20 likes — once per order.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const base = () => Deno.env.get("PAYPAL_ENV") === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

async function accessToken() {
  const id = Deno.env.get("PAYPAL_CLIENT_ID")!, secret = Deno.env.get("PAYPAL_CLIENT_SECRET")!;
  const r = await fetch(base() + "/v1/oauth2/token", {
    method: "POST",
    headers: { Authorization: "Basic " + btoa(`${id}:${secret}`), "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const d = await r.json();
  if (!r.ok) throw new Error("PayPal login failed");
  return d.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ error: "Please sign in again." }, 401);

    const { order_id } = await req.json();
    if (!order_id) return json({ error: "Missing order." }, 400);

    const token = await accessToken();
    const H = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    let r = await fetch(`${base()}/v2/checkout/orders/${order_id}`, { headers: H });
    let order = await r.json();
    if (!r.ok) return json({ error: "Order not found." }, 404);
    if (order.purchase_units?.[0]?.custom_id !== user.id) return json({ error: "This order belongs to someone else." }, 403);

    if (order.status === "APPROVED") {
      r = await fetch(`${base()}/v2/checkout/orders/${order_id}/capture`, { method: "POST", headers: H });
      order = await r.json();
      if (!r.ok) return json({ error: "PayPal could not take the payment." }, 402);
    }
    if (order.status !== "COMPLETED") return json({ error: "Payment not completed yet." }, 402);

    const cap = order.purchase_units?.[0]?.payments?.captures?.[0];
    if (!cap || cap.status !== "COMPLETED" || cap.amount?.currency_code !== "GBP" || Number(cap.amount?.value) < 3.99) {
      return json({ error: "Payment amount did not match." }, 402);
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const g = await admin.rpc("grant_like_credits", { p_user: user.id, p_order: order_id, p_amount: Number(cap.amount.value) });
    if (g.error) return json({ error: g.error.message }, 500);
    return json({ ok: true, granted: g.data === true });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
