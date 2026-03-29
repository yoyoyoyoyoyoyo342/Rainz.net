import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Web Push Encryption (RFC 8291) ──────────────────────────────

function base64urlDecode(str: string): Uint8Array {
  const padding = "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function base64urlEncode(str: string): string {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlEncodeBuffer(buf: Uint8Array): string {
  let binary = "";
  for (const byte of buf) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// HKDF extract + expand (RFC 5869)
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", salt.length ? salt : new Uint8Array(32), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", key, ikm));
  
  const infoKey = await crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const t = new Uint8Array(await crypto.subtle.sign("HMAC", infoKey, concat(info, new Uint8Array([1]))));
  return t.slice(0, length);
}

function createInfo(type: string, clientPublicKey: Uint8Array, serverPublicKey: Uint8Array): Uint8Array {
  const encoder = new TextEncoder();
  const typeBytes = encoder.encode(type);
  const header = encoder.encode("Content-Encoding: ");
  const nul = new Uint8Array([0]);
  const webPush = encoder.encode("WebPush: info");
  
  // "Content-Encoding: <type>\0P-256\0" + len(client) + client + len(server) + server
  const label = encoder.encode(`Content-Encoding: ${type}\0`);
  const p256 = encoder.encode("P-256\0");
  
  const clientLen = new Uint8Array(2);
  new DataView(clientLen.buffer).setUint16(0, clientPublicKey.length);
  const serverLen = new Uint8Array(2);
  new DataView(serverLen.buffer).setUint16(0, serverPublicKey.length);
  
  return concat(label, p256, clientLen, clientPublicKey, serverLen, serverPublicKey);
}

async function encryptPayload(
  payload: string,
  subscriptionKeys: { p256dh: string; auth: string }
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const clientPublicKey = base64urlDecode(subscriptionKeys.p256dh);
  const clientAuth = base64urlDecode(subscriptionKeys.auth);
  
  // Generate ephemeral ECDH key pair
  const serverKeys = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  
  // Export server public key (uncompressed point)
  const serverPublicKeyRaw = new Uint8Array(await crypto.subtle.exportKey("raw", serverKeys.publicKey));
  
  // Import client public key
  const clientKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  
  // ECDH shared secret
  const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientKey },
    serverKeys.privateKey,
    256
  ));
  
  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // IKM = HKDF(auth, sharedSecret, "WebPush: info" || 0x00 || client_pub || server_pub, 32)
  const encoder = new TextEncoder();
  const authInfo = concat(
    encoder.encode("WebPush: info\0"),
    clientPublicKey,
    serverPublicKey
  );
  const ikm = await hkdf(clientAuth, sharedSecret, authInfo, 32);
  
  // CEK = HKDF(salt, ikm, "Content-Encoding: aes128gcm" || 0x00, 16)
  const cekInfo = concat(encoder.encode("Content-Encoding: aes128gcm\0"));
  const contentEncryptionKey = await hkdf(salt, ikm, cekInfo, 16);
  
  // Nonce = HKDF(salt, ikm, "Content-Encoding: nonce" || 0x00, 12)
  const nonceInfo = concat(encoder.encode("Content-Encoding: nonce\0"));
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);
  
  // Pad payload: add 0x02 delimiter then the plaintext
  const payloadBytes = encoder.encode(payload);
  const paddedPayload = concat(payloadBytes, new Uint8Array([2]));
  
  // AES-128-GCM encrypt
  const key = await crypto.subtle.importKey("raw", contentEncryptionKey, { name: "AES-GCM" }, false, ["encrypt"]);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    key,
    paddedPayload
  ));
  
  // Build aes128gcm header: salt(16) || rs(4) || idlen(1) || keyid(65) || ciphertext
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  const idlen = new Uint8Array([serverPublicKeyRaw.length]);
  
  const body = concat(salt, rs, idlen, serverPublicKeyRaw, encrypted);
  
  return { ciphertext: body, salt, serverPublicKey: serverPublicKeyRaw };
}

// ── VAPID JWT Generation ─────────────────────────────────────

async function generateJWT(vapidPrivateKeyBase64: string, audience: string, subject: string): Promise<string> {
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
  const payload = { aud: audience, exp: now + 12 * 60 * 60, sub: subject };

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  const rawSig = derToRaw(new Uint8Array(signature));
  const encodedSignature = base64urlEncodeBuffer(rawSig);

  return `${unsignedToken}.${encodedSignature}`;
}

function convertRawToP256PKCS8(raw: Uint8Array): ArrayBuffer {
  const pkcs8Header = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86,
    0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02, 0x01, 0x01, 0x04, 0x20,
  ]);
  const result = new Uint8Array(pkcs8Header.length + raw.length);
  result.set(pkcs8Header);
  result.set(raw, pkcs8Header.length);
  return result.buffer;
}

function derToRaw(der: Uint8Array): Uint8Array {
  if (der.length === 64) return der;
  const raw = new Uint8Array(64);
  let offset = 2;
  if (der[offset] !== 0x02) throw new Error("Invalid DER");
  offset++;
  let rLen = der[offset++];
  let rStart = offset;
  if (der[rStart] === 0x00) { rStart++; rLen--; }
  raw.set(der.slice(rStart, rStart + Math.min(rLen, 32)), 32 - Math.min(rLen, 32));
  offset = 2 + 2 + der[3];
  if (der[offset] !== 0x02) throw new Error("Invalid DER");
  offset++;
  let sLen = der[offset++];
  let sStart = offset;
  if (der[sStart] === 0x00) { sStart++; sLen--; }
  raw.set(der.slice(sStart, sStart + Math.min(sLen, 32)), 64 - Math.min(sLen, 32));
  return raw;
}

// ── Send Web Push with Encryption ────────────────────────────

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

    // Encrypt the payload per RFC 8291
    const { ciphertext } = await encryptPayload(payload, {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    });

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        TTL: "86400",
        Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
        Urgency: "high",
      },
      body: ciphertext,
    });

    if (response.status === 201 || response.status === 200) {
      console.log(`Push sent successfully to ${subscription.endpoint.slice(0, 50)}...`);
      return true;
    }

    if (response.status === 410 || response.status === 404) {
      console.log(`Subscription expired: ${subscription.endpoint.slice(0, 50)}...`);
      return false;
    }

    const responseText = await response.text();
    console.error(`Push failed with status ${response.status}: ${responseText}`);
    return false;
  } catch (err) {
    console.error(`Push error:`, err);
    return false;
  }
}

// ── Main Handler ──────────────────────────────────────────────

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
    } else {
      console.warn("VAPID keys not configured, skipping push delivery");
    }

    console.log(`Notification for ${user_id}: in-app ${skipInbox ? '(skipped)' : '✓'}, push sent: ${pushesSent}, failed: ${pushesFailed}`);

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
