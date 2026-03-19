import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Base64url helpers ──────────────────────────────────────────────────
function b64urlEncode(buf: Uint8Array): string {
  let b = "";
  for (const byte of buf) b += String.fromCharCode(byte);
  return btoa(b).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Uint8Array {
  const pad = "=".repeat((4 - (str.length % 4)) % 4);
  const raw = atob((str + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

// ── VAPID JWT ──────────────────────────────────────────────────────────
async function createVapidJwt(
  privateKeyB64: string,
  audience: string,
  subject: string,
): Promise<string> {
  const rawKey = b64urlDecode(privateKeyB64);

  // Wrap the 32-byte raw key into PKCS8 for P-256
  const pkcs8Header = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13,
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
    0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02,
    0x01, 0x01, 0x04, 0x20,
  ]);
  // We need the full PKCS8 structure with an empty public key section
  const pkcs8Tail = new Uint8Array([
    0xa1, 0x44, 0x03, 0x42, 0x00, 0x04,
    // 64 bytes of zeros as placeholder public key (not used for signing)
    ...new Array(64).fill(0),
  ]);

  // Actually we need to derive the public key or use a simpler approach.
  // Instead, import as JWK which is more reliable:
  const jwk = {
    kty: "EC",
    crv: "P-256",
    d: privateKeyB64, // already base64url
    // We need x,y but don't have them. Let's use raw PKCS8 without public key.
    x: "", // will fill below
    y: "",
  };

  // Simpler: use raw PKCS8 with just private key bytes
  const fullPkcs8 = new Uint8Array(pkcs8Header.length + 32);
  fullPkcs8.set(pkcs8Header);
  fullPkcs8.set(rawKey.slice(0, 32), pkcs8Header.length);

  // Try importing — if the runtime needs public key portion, we'll handle it
  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey(
      "pkcs8",
      fullPkcs8.buffer,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"],
    );
  } catch {
    // Fallback: generate ephemeral key pair, export private JWK, replace d
    const tempPair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign"],
    );
    const tempJwk = await crypto.subtle.exportKey("jwk", tempPair.privateKey);
    tempJwk.d = privateKeyB64;
    // Derive public coords from private key using ECDH trick
    // Actually, we can't easily. Let's try importing with just d and see.
    // We need to compute x,y from d. Use a helper:
    const { x, y } = await derivePublicCoords(rawKey);
    tempJwk.x = x;
    tempJwk.y = y;
    key = await crypto.subtle.importKey(
      "jwk",
      tempJwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"],
    );
  }

  const header = b64urlEncode(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64urlEncode(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: now + 12 * 3600,
    sub: subject,
  })));

  const unsigned = `${header}.${payload}`;
  const sig = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      new TextEncoder().encode(unsigned),
    ),
  );

  // WebCrypto returns r||s (64 bytes) for P-256, but some runtimes return DER
  const rawSig = sig.length === 64 ? sig : derToRaw(sig);
  return `${unsigned}.${b64urlEncode(rawSig)}`;
}

async function derivePublicCoords(privateKeyRaw: Uint8Array): Promise<{ x: string; y: string }> {
  // Import as ECDH to derive public key
  const pkcs8Header = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13,
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
    0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02,
    0x01, 0x01, 0x04, 0x20,
  ]);
  const buf = new Uint8Array(pkcs8Header.length + 32);
  buf.set(pkcs8Header);
  buf.set(privateKeyRaw.slice(0, 32), pkcs8Header.length);

  try {
    const ecdhKey = await crypto.subtle.importKey(
      "pkcs8",
      buf.buffer,
      { name: "ECDH", namedCurve: "P-256" },
      true,
      ["deriveBits"],
    );
    const jwk = await crypto.subtle.exportKey("jwk", ecdhKey);
    return { x: jwk.x!, y: jwk.y! };
  } catch {
    // If PKCS8 import fails without public key, build full PKCS8
    // This is a known issue, try with JWK round-trip
    throw new Error("Cannot derive public coords from private key");
  }
}

function derToRaw(der: Uint8Array): Uint8Array {
  if (der.length === 64) return der;
  const raw = new Uint8Array(64);
  // SEQUENCE -> INTEGER r -> INTEGER s
  let idx = 2; // skip 0x30 + length
  if (der[idx] !== 0x02) throw new Error("Invalid DER");
  idx++;
  const rLen = der[idx++];
  const rEnd = idx + rLen;
  const rBytes = der.slice(idx, rEnd);
  idx = rEnd;
  if (der[idx] !== 0x02) throw new Error("Invalid DER");
  idx++;
  const sLen = der[idx++];
  const sEnd = idx + sLen;
  const sBytes = der.slice(idx, sEnd);

  // Copy r (strip leading zero if present, pad to 32)
  const rTrim = rBytes[0] === 0 ? rBytes.slice(1) : rBytes;
  raw.set(rTrim, 32 - rTrim.length);
  // Copy s
  const sTrim = sBytes[0] === 0 ? sBytes.slice(1) : sBytes;
  raw.set(sTrim, 64 - sTrim.length);
  return raw;
}

// ── RFC 8291 Web Push Encryption (aes128gcm) ──────────────────────────

async function encryptPayload(
  clientPublicKeyB64: string,
  clientAuthB64: string,
  payload: Uint8Array,
): Promise<{ encrypted: Uint8Array; localPublicKey: Uint8Array; salt: Uint8Array }> {
  const clientPublicKeyRaw = b64urlDecode(clientPublicKeyB64);
  const clientAuth = b64urlDecode(clientAuthB64);

  // Generate ephemeral ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );

  // Export local public key as uncompressed point (65 bytes)
  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey),
  );

  // Import client public key
  const clientPublicKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKeyRaw,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );

  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: clientPublicKey },
      localKeyPair.privateKey,
      256,
    ),
  );

  // Generate 16-byte salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Derive key material using HKDF
  // IKM = HKDF-Extract(auth_secret, ecdh_secret)
  const ikmInfo = concatBytes(
    new TextEncoder().encode("WebPush: info\0"),
    clientPublicKeyRaw,
    localPublicKeyRaw,
  );
  const ikm = await hkdfDerive(clientAuth, sharedSecret, ikmInfo, 32);

  // Derive CEK and nonce
  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");

  const cek = await hkdfDerive(salt, ikm, cekInfo, 16);
  const nonce = await hkdfDerive(salt, ikm, nonceInfo, 12);

  // Pad plaintext: add delimiter byte 0x02 and no padding for simplicity
  const padded = new Uint8Array(payload.length + 1);
  padded.set(payload);
  padded[payload.length] = 2; // delimiter

  // AES-128-GCM encrypt
  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded),
  );

  // Build aes128gcm header: salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + localPublicKeyRaw.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, rs);
  header[20] = localPublicKeyRaw.length;
  header.set(localPublicKeyRaw, 21);

  const encrypted = concatBytes(header, ciphertext);
  return { encrypted, localPublicKey: localPublicKeyRaw, salt };
}

async function hkdfDerive(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((a, b) => a + b.length, 0);
  const result = new Uint8Array(len);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// ── Send Web Push ──────────────────────────────────────────────────────

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
): Promise<boolean> {
  try {
    const endpointUrl = new URL(subscription.endpoint);
    const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

    // 1. Create VAPID JWT
    const jwt = await createVapidJwt(vapidPrivateKey, audience, "mailto:hello@rainz.app");

    // 2. Encrypt the payload using RFC 8291
    const payloadBytes = new TextEncoder().encode(payload);
    const { encrypted } = await encryptPayload(
      subscription.p256dh,
      subscription.auth,
      payloadBytes,
    );

    // 3. Send to push service
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        TTL: "86400",
        Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
        Urgency: "high",
      },
      body: encrypted,
    });

    if (response.status === 201 || response.status === 200) {
      console.log(`Push sent OK to ${subscription.endpoint.slice(0, 50)}...`);
      return true;
    }

    if (response.status === 410 || response.status === 404) {
      console.log(`Subscription expired: ${subscription.endpoint.slice(0, 50)}...`);
      return false;
    }

    const body = await response.text();
    console.error(`Push failed ${response.status}: ${body}`);
    return false;
  } catch (err) {
    console.error(`Push error:`, err);
    return false;
  }
}

// ── Main handler ───────────────────────────────────────────────────────

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

    // Always create in-app notification
    await supabase.from("user_notifications").insert({
      user_id,
      type: data?.type || "push",
      title,
      message: body,
      metadata: data || {},
    });

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
            vapidPrivateKey,
          );

          if (success) {
            pushesSent++;
          } else {
            pushesFailed++;
            // Remove expired/invalid subscriptions
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          }
        }
      }
    } else {
      console.warn("VAPID keys not configured, skipping push");
    }

    console.log(`Notification for ${user_id}: in-app ✓, push sent: ${pushesSent}, failed: ${pushesFailed}`);

    return new Response(
      JSON.stringify({ success: true, pushesSent, pushesFailed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
