import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Base64url helpers ──
function base64UrlToUint8Array(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(b64 + pad);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function uint8ArrayToBase64Url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((s, a) => s + a.length, 0);
  const result = new Uint8Array(len);
  let off = 0;
  for (const a of arrays) { result.set(a, off); off += a.length; }
  return result;
}

// ── VAPID JWT ──
async function createVapidJwt(audience: string, subject: string, privateKeyB64Url: string) {
  const header = { alg: "ES256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 3600, sub: subject };

  const headerB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsigned = `${headerB64}.${payloadB64}`;

  // Import raw 32-byte VAPID private key via JWK
  // We need to derive the public key from the private key to construct the JWK
  // First import as ECDH to get the public key, then re-import as ECDSA
  const rawKey = base64UrlToUint8Array(privateKeyB64Url);
  const d = uint8ArrayToBase64Url(rawKey);

  // Derive public key: import private as JWK for ECDH, export, get x/y
  // We need x, y coords — derive from the VAPID public key env var
  const vapidPubBytes = base64UrlToUint8Array(Deno.env.get("VAPID_PUBLIC_KEY")!);
  const x = uint8ArrayToBase64Url(vapidPubBytes.slice(1, 33));
  const y = uint8ArrayToBase64Url(vapidPubBytes.slice(33, 65));

  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x, y, d, ext: true },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(unsigned)));

  // Ensure raw r||s (64 bytes) — may come as DER
  const rawSig = sig.length === 64 ? sig : derToRaw(sig);
  return `${unsigned}.${uint8ArrayToBase64Url(rawSig)}`;
}

function derToRaw(der: Uint8Array): Uint8Array {
  const raw = new Uint8Array(64);
  let off = 2;
  const rLen = der[off + 1]; off += 2;
  const rSrc = rLen > 32 ? off + rLen - 32 : off;
  const rDst = rLen < 32 ? 32 - rLen : 0;
  raw.set(der.slice(rSrc, off + rLen), rDst); off += rLen;
  const sLen = der[off + 1]; off += 2;
  const sSrc = sLen > 32 ? off + sLen - 32 : off;
  const sDst = sLen < 32 ? 32 + 32 - sLen : 32;
  raw.set(der.slice(sSrc, off + sLen), sDst);
  return raw;
}

// ── HKDF helper ──
async function hkdfDerive(ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, bits: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, bits));
}

// ── Web Push Encryption (aes128gcm, RFC 8291) ──
async function encryptPayload(p256dhB64: string, authB64: string, plaintext: string) {
  const userPubBytes = base64UrlToUint8Array(p256dhB64);
  const authSecret = base64UrlToUint8Array(authB64);

  // Generate ephemeral ECDH key pair
  const localKP = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const localPubRaw = new Uint8Array(await crypto.subtle.exportKey("raw", localKP.publicKey));

  // Import user's public key as JWK (raw import may fail in some runtimes)
  // Uncompressed P-256 key: 0x04 || x (32 bytes) || y (32 bytes)
  const x = uint8ArrayToBase64Url(userPubBytes.slice(1, 33));
  const y = uint8ArrayToBase64Url(userPubBytes.slice(33, 65));
  const userPubKey = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", x, y },
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: userPubKey }, localKP.privateKey, 256));

  // IKM = HKDF(auth_secret, ecdh_secret, "WebPush: info\0" || ua_public || as_public, 32)
  const webpushInfo = concat(new TextEncoder().encode("WebPush: info\0"), userPubBytes, localPubRaw);
  const ikm = await hkdfDerive(ecdhSecret, authSecret, webpushInfo, 256);

  // Generate 16-byte salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // CEK = HKDF(ikm, salt, "Content-Encoding: aes128gcm\0", 16)
  const cek = await hkdfDerive(ikm, salt, new TextEncoder().encode("Content-Encoding: aes128gcm\0"), 128);

  // Nonce = HKDF(ikm, salt, "Content-Encoding: nonce\0", 12)
  const nonce = await hkdfDerive(ikm, salt, new TextEncoder().encode("Content-Encoding: nonce\0"), 96);

  // Encrypt with AES-128-GCM (add 0x02 padding delimiter for final record)
  const padded = concat(new TextEncoder().encode(plaintext), new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, padded));

  // Build aes128gcm header: salt(16) + rs(4) + idlen(1) + keyid(65)
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  return concat(salt, rs, new Uint8Array([localPubRaw.length]), localPubRaw, ciphertext);
}

// ── Send one push ──
async function sendPush(
  endpoint: string, p256dh: string, auth: string, payload: string,
  vapidPub: string, vapidPriv: string, vapidSubject: string
): Promise<{ success: boolean; status?: number; expired?: boolean; error?: string }> {
  try {
    const url = new URL(endpoint);
    const audience = `${url.protocol}//${url.host}`;
    let jwt: string;
    try {
      jwt = await createVapidJwt(audience, vapidSubject, vapidPriv);
    } catch (e) {
      return { success: false, error: `VAPID_JWT: ${String(e).slice(0, 150)}` };
    }
    let body: Uint8Array;
    try {
      body = await encryptPayload(p256dh, auth, payload);
    } catch (e) {
      return { success: false, error: `ENCRYPT: ${String(e).slice(0, 150)}` };
    }

    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "TTL": "86400",
        "Authorization": `vapid t=${jwt}, k=${vapidPub}`,
      },
      body,
    });

    if (resp.status === 404 || resp.status === 410) {
      return { success: false, status: resp.status, expired: true };
    }
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return { success: false, status: resp.status, error: text.slice(0, 200) };
    }
    return { success: true, status: resp.status };
  } catch (err) {
    return { success: false, error: String(err).slice(0, 200) };
  }
}

// ── Reminder messages ──
const MESSAGES = [
  "Time to learn your German words! \u{1F1E9}\u{1F1EA}",
  "Your daily German practice awaits! \u{1F4DA}",
  "Don't break your streak! Study German today \u{1F525}",
  "5 minutes of German = big progress! Let's go \u{1F4AA}",
  "Guten Morgen! Ready to learn some German? \u{2600}\u{FE0F}",
  "Your German vocabulary is waiting for you! \u{1F3AF}",
  "Quick study session? Your future self will thank you! \u{2B50}",
];

// ── Main handler ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let testMode = false;
    try { const b = await req.json(); testMode = b?.test === true; } catch { /* ok */ }

    const vapidPub = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPriv = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: subs, error } = await supabase.from("push_subscriptions").select("*").eq("active", true);
    if (error || !subs) {
      return new Response(JSON.stringify({ error: "Failed to fetch subscriptions" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    let sent = 0, expired = 0;
    const errors: string[] = [];

    for (const sub of subs) {
      const userTime = new Date(now.toLocaleString("en-US", { timeZone: sub.timezone || "Asia/Ho_Chi_Minh" }));
      if (!testMode && userTime.getHours() !== sub.reminder_hour) continue;

      const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
      const payload = JSON.stringify({ title: "Vocabulary Study", body: msg, url: "/" });
      const result = await sendPush(sub.endpoint, sub.keys_p256dh, sub.keys_auth, payload, vapidPub, vapidPriv, "mailto:uniques@officience.com");

      if (result.success) {
        sent++;
      } else {
        errors.push(`${sub.endpoint.slice(0, 50)}... s=${result.status} e=${result.error || "?"}`);
      }
      if (result.expired) {
        await supabase.from("push_subscriptions").update({ active: false, updated_at: new Date().toISOString() }).eq("endpoint", sub.endpoint);
        expired++;
      }
    }

    return new Response(JSON.stringify({ sent, expired, total: subs.length, errors, testMode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err).slice(0, 300) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
