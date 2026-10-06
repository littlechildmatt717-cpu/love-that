// Creates a £4.99 PayPal order for 20 extra likes and returns the PayPal approval link.
// Secrets needed (supabase secrets set ...): PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET,
// PAYPAL_ENV ("live" or "sandbox"), PAYPAL_RETURN_URL (a page you own to land on after paying)
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

    const returnUrl = Deno.env.get("PAYPAL_RETURN_URL") ?? "https://example.com";
    const token = await accessToken();
    const r = await fetch(base() + "/v2/checkout/orders", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          custom_id: user.id,
          description: "20 extra likes",
          amount: { currency_code: "GBP", value: "4.99" },
        }],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: "love that",
              user_action: "PAY_NOW",
              return_url: returnUrl,
              cancel_url: returnUrl,
            },
          },
        },
      }),
    });
    const d = await r.json();
    if (!r.ok) return json({ error: d?.message || "PayPal could not create the order." }, 502);
    const link = (d.links || []).find((l: any) => l.rel === "payer-action" || l.rel === "approve")?.href;
    return json({ order_id: d.id, approve_url: link });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
