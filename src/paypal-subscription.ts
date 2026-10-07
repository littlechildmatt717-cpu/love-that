// £9.99/month ad-free subscription via PayPal Subscriptions.
// Actions: create (returns PayPal link), status (checks PayPal, returns {active}), cancel.
// Uses the same secrets as the likes function: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENV, PAYPAL_RETURN_URL.
// The PayPal product + plan are created automatically the first time and reused after that.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const ENV = () => (Deno.env.get("PAYPAL_ENV") === "live" ? "live" : "sandbox");
const base = () => ENV() === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

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

async function getPlanId(admin: any, H: Record<string, string>) {
  const key = `ad_free_plan_gbp_999_${ENV()}`;
  const { data } = await admin.from("paypal_config").select("value").eq("key", key).maybeSingle();
  if (data?.value) return data.value as string;

  let r = await fetch(base() + "/v1/catalogs/products", {
    method: "POST", headers: H,
    body: JSON.stringify({ name: "love that ad-free", description: "Ad-free account, billed monthly", type: "DIGITAL", category: "SOFTWARE" }),
  });
  const prod = await r.json();
  if (!r.ok) throw new Error("PayPal could not create the product: " + (prod?.message || r.status));

  r = await fetch(base() + "/v1/billing/plans", {
    method: "POST", headers: H,
    body: JSON.stringify({
      product_id: prod.id,
      name: "Ad-free monthly",
      description: "Ad-free account for £9.99 per month",
      status: "ACTIVE",
      billing_cycles: [{
        frequency: { interval_unit: "MONTH", interval_count: 1 },
        tenure_type: "REGULAR", sequence: 1, total_cycles: 0,
        pricing_scheme: { fixed_price: { value: "9.99", currency_code: "GBP" } },
      }],
      payment_preferences: { auto_bill_outstanding: true, payment_failure_threshold: 3 },
    }),
  });
  const plan = await r.json();
  if (!r.ok) throw new Error("PayPal could not create the plan: " + (plan?.message || r.status));
  await admin.from("paypal_config").upsert({ key, value: plan.id });
  return plan.id as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ error: "Please sign in again." }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const token = await accessToken();
    const H = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    if (action === "create") {
      const planId = await getPlanId(admin, H);
      const returnUrl = Deno.env.get("PAYPAL_RETURN_URL") ?? "https://example.com";
      const r = await fetch(base() + "/v1/billing/subscriptions", {
        method: "POST", headers: H,
        body: JSON.stringify({
          plan_id: planId,
          custom_id: user.id,
          application_context: {
            brand_name: "love that", locale: "en-GB", user_action: "SUBSCRIBE_NOW",
            return_url: returnUrl, cancel_url: returnUrl,
          },
        }),
      });
      const d = await r.json();
      if (!r.ok) return json({ error: d?.message || "PayPal could not start the subscription." }, 502);
      const link = (d.links || []).find((l: any) => l.rel === "approve")?.href;
      return json({ subscription_id: d.id, approve_url: link });
    }

    // Find which subscription to look at: one passed in (just paid) or the one we have stored.
    const { data: stored } = await admin.from("ad_free").select("*").eq("user_id", user.id).maybeSingle();
    const subId: string | undefined = body.subscription_id || stored?.subscription_id;
    if (!subId) return json({ active: false });

    const r = await fetch(`${base()}/v1/billing/subscriptions/${subId}`, { headers: H });
    const sub = await r.json();
    if (!r.ok) return json({ active: false });
    if (sub.custom_id !== user.id) return json({ error: "This subscription belongs to someone else." }, 403);

    const next = sub.billing_info?.next_billing_time ? new Date(sub.billing_info.next_billing_time).toISOString() : null;

    if (action === "cancel") {
      if (sub.status === "ACTIVE") {
        const c = await fetch(`${base()}/v1/billing/subscriptions/${subId}/cancel`, {
          method: "POST", headers: H, body: JSON.stringify({ reason: "Cancelled by user" }),
        });
        if (!c.ok) return json({ error: "PayPal could not cancel the subscription." }, 502);
      }
      await admin.from("ad_free").upsert({ user_id: user.id, subscription_id: subId, status: "CANCELLED", ends_at: next ?? stored?.ends_at ?? new Date().toISOString() });
      return json({ ok: true });
    }

    // action === "status"
    let status: string = sub.status;
    let endsAt: string | null = stored?.ends_at ?? null;
    if (status === "ACTIVE") endsAt = next ?? endsAt;
    if (status === "APPROVAL_PENDING" || status === "APPROVED") {
      return json({ active: false, pending: true });
    }
    await admin.from("ad_free").upsert({ user_id: user.id, subscription_id: subId, status, ends_at: endsAt });
    const active = status === "ACTIVE" || (!!endsAt && new Date(endsAt).getTime() > Date.now());
    return json({ active });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
