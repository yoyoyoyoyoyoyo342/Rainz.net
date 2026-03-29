import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Web Push crypto utilities for Deno
async function generateJWT(vapidPrivateKeyBase64: string, audience: string, subject: string): Promise<string> {
  // Decode the base64url private key
  const padding = "=".repeat((4 - (vapidPrivateKeyBase64.length % 4)) % 4);
  const base64 = (vapidPrivateKeyBase64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawKey = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    convertRawToP256PKCS8(rawKey),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: subject,
  };

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format
  const rawSig = derToRaw(new Uint8Array(signature));
  const encodedSignature = base64urlEncodeBuffer(rawSig);

  return `${unsignedToken}.${encodedSignature}`;
}

function convertRawToP256PKCS8(raw: Uint8Array): ArrayBuffer {
  // PKCS8 wrapper for P-256 private key (raw 32 bytes)
  const pkcs8Header = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86,
    0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02, 0x01, 0x01, 0x04, 0x20,
  ]);
  const pkcs8Footer = new Uint8Array([
    0xa1, 0x44, 0x03, 0x42, 0x00,
  ]);
  // We only have the private key bytes, skip public key in footer
  const result = new Uint8Array(pkcs8Header.length + raw.length);
  result.set(pkcs8Header);
  result.set(raw, pkcs8Header.length);
  return result.buffer;
}

function derToRaw(der: Uint8Array): Uint8Array {
  // If it's already 64 bytes (raw format), return as-is
  if (der.length === 64) return der;
  
  // Parse DER encoded ECDSA signature
  const raw = new Uint8Array(64);
  
  let offset = 2; // Skip SEQUENCE tag and length
  
  // Read r
  if (der[offset] !== 0x02) throw new Error("Invalid DER");
  offset++;
  let rLen = der[offset++];
  let rStart = offset;
  if (der[rStart] === 0x00) { rStart++; rLen--; }
  raw.set(der.slice(rStart, rStart + Math.min(rLen, 32)), 32 - Math.min(rLen, 32));
  offset = rStart + rLen + (der[rStart - 1] === 0x00 ? 0 : 0);
  offset = 2 + 2 + der[3]; // Skip to s
  
  // Read s
  if (der[offset] !== 0x02) throw new Error("Invalid DER");
  offset++;
  let sLen = der[offset++];
  let sStart = offset;
  if (der[sStart] === 0x00) { sStart++; sLen--; }
  raw.set(der.slice(sStart, sStart + Math.min(sLen, 32)), 64 - Math.min(sLen, 32));
  
  return raw;
}

function base64urlEncode(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlEncodeBuffer(buf: Uint8Array): string {
  let binary = "";
  for (const byte of buf) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  const padding = "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    const endpointUrl = new URL(subscription.endpoint);
    const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

    // Generate VAPID JWT
    const jwt = await generateJWT(vapidPrivateKey, audience, "mailto:hello@rainz.app");

    // Create encrypted payload using simple approach
    // For now, send as plaintext with VAPID auth (most push services accept this)
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
      "Content-Type": "application/json",
        TTL: "86400",
        Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
        Urgency: "high",
      },
      body: payload,
    });

    if (response.status === 201 || response.status === 200) {
      console.log(`Push sent successfully to ${subscription.endpoint.slice(0, 50)}...`);
      return true;
    }

    if (response.status === 410 || response.status === 404) {
      console.log(`Subscription expired, should be removed: ${subscription.endpoint.slice(0, 50)}...`);
      return false;
    }

    console.error(`Push failed with status ${response.status}: ${await response.text()}`);
    return false;
  } catch (err) {
    console.error(`Push error:`, err);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    const { user_id, title, body, data } = await req.json();

    if (!user_id || !title || !body) {
      return new Response(JSON.stringify({ error: "Missing user_id, title, or body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only create in-app notification if skip_inbox is not set
    // (prevents infinite loop when triggered by inbox insert trigger)
    const skipInbox = data?.skip_inbox === true;
    if (!skipInbox) {
      await supabase.from("user_notifications").insert({
        user_id,
        type: data?.type || "push",
        title,
        message: body,
        metadata: data || {},
      });
    }

    let pushesSent = 0;
    let pushesFailed = 0;

    // Send real Web Push notifications if VAPID keys are configured
    if (vapidPublicKey && vapidPrivateKey) {
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", user_id);

      if (subscriptions && subscriptions.length > 0) {
        const payload = JSON.stringify({ title, body, data: data || {} });

        for (const sub of subscriptions) {
          const success = await sendWebPush(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            payload,
            vapidPublicKey,
            vapidPrivateKey
          );

          if (success) {
            pushesSent++;
          } else {
            pushesFailed++;
            // Remove expired/invalid subscriptions
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("id", sub.id);
          }
        }
      }
    }

    console.log(`Notification for ${user_id}: in-app ✓, push sent: ${pushesSent}, failed: ${pushesFailed}`);

    return new Response(
      JSON.stringify({ success: true, pushesSent, pushesFailed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
