import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Web Push requires signing payloads with VAPID keys
// Using the web-push-encryption approach for Deno

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Convert base64url to Uint8Array
function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Convert Uint8Array to base64url
function uint8ArrayToBase64Url(arr: Uint8Array): string {
  const binary = String.fromCharCode(...arr);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Create VAPID JWT token
async function createVapidJwt(
  audience: string,
  subject: string,
  privateKeyBase64Url: string
): Promise<string> {
  const header = { alg: "ES256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: subject,
  };

  const headerB64 = uint8ArrayToBase64Url(
    new TextEncoder().encode(JSON.stringify(header))
  );
  const payloadB64 = uint8ArrayToBase64Url(
    new TextEncoder().encode(JSON.stringify(payload))
  );
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the VAPID private key
  const privateKeyBytes = base64UrlToUint8Array(privateKeyBase64Url);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    privateKeyBytes,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  // Sign
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format (64 bytes)
  const sigArray = new Uint8Array(signature);
  let rawSig: Uint8Array;
  if (sigArray.length === 64) {
    rawSig = sigArray;
  } else {
    // DER encoded - parse it
    rawSig = derToRaw(sigArray);
  }

  const signatureB64 = uint8ArrayToBase64Url(rawSig);
  return `${unsignedToken}.${signatureB64}`;
}

function derToRaw(der: Uint8Array): Uint8Array {
  const raw = new Uint8Array(64);
  // DER format: 0x30 len 0x02 rLen r 0x02 sLen s
  let offset = 2; // skip 0x30 and total length
  // R
  const rLen = der[offset + 1];
  offset += 2;
  const rStart = rLen > 32 ? offset + (rLen - 32) : offset;
  const rDest = rLen < 32 ? 32 - rLen : 0;
  raw.set(der.slice(rStart, offset + rLen), rDest);
  offset += rLen;
  // S
  const sLen = der[offset + 1];
  offset += 2;
  const sStart = sLen > 32 ? offset + (sLen - 32) : offset;
  const sDest = sLen < 32 ? 32 + (32 - sLen) : 32;
  raw.set(der.slice(sStart, offset + sLen), sDest);
  return raw;
}

// Encrypt push payload using Web Push encryption (aes128gcm)
async function encryptPayload(
  p256dhKey: string,
  authSecret: string,
  payload: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const userPublicKeyBytes = base64UrlToUint8Array(p256dhKey);
  const userAuthBytes = base64UrlToUint8Array(authSecret);

  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  // Export local public key (uncompressed)
  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
  );

  // Import user's public key
  const userPublicKey = await crypto.subtle.importKey(
    "raw",
    userPublicKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: userPublicKey },
      localKeyPair.privateKey,
      256
    )
  );

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF to derive keys using auth secret
  const authInfo = new TextEncoder().encode("Content-Encoding: auth\0");
  const prkCombine = new Uint8Array([...userAuthBytes]);
  const ikmKey = await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveBits"]);

  // PRK = HKDF-Extract(auth_secret, shared_secret)
  const prkKey = await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveBits"]);

  // Build key_info and nonce_info for aes128gcm
  const keyInfo = concatArrays(
    new TextEncoder().encode("Content-Encoding: aes128gcm\0"),
    new Uint8Array([0]),
    userPublicKeyBytes,
    localPublicKeyRaw
  );
  const nonceInfo = concatArrays(
    new TextEncoder().encode("Content-Encoding: nonce\0"),
    new Uint8Array([0]),
    userPublicKeyBytes,
    localPublicKeyRaw
  );

  // Use HKDF with auth as salt and ECDH result as IKM
  const hkdfKey = await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, [
    "deriveBits",
  ]);

  // IKM for final HKDF = HKDF(auth_secret, ecdh_secret, "WebPush: info\0" || ua_public || as_public, 32)
  const authHkdfKey = await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveBits"]);
  const webpushInfo = concatArrays(
    new TextEncoder().encode("WebPush: info\0"),
    userPublicKeyBytes,
    localPublicKeyRaw
  );
  const ikm = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: userAuthBytes, info: webpushInfo },
      authHkdfKey,
      256
    )
  );

  // Derive content encryption key
  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const cekHkdfKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const cekBits = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: salt, info: cekInfo },
      cekHkdfKey,
      128
    )
  );

  // Derive nonce
  const nonceHkdfInfo = new TextEncoder().encode("Content-Encoding: nonce\0");
  const nonceHkdfKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const nonce = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "HKDF", hash: "SHA-256", salt: salt, info: nonceHkdfInfo },
      nonceHkdfKey,
      96
    )
  );

  // Encrypt with AES-128-GCM
  const payloadBytes = new TextEncoder().encode(payload);
  // Add padding delimiter (0x02 for final record)
  const paddedPayload = concatArrays(payloadBytes, new Uint8Array([2]));

  const aesKey = await crypto.subtle.importKey("raw", cekBits, "AES-GCM", false, ["encrypt"]);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      aesKey,
      paddedPayload
    )
  );

  // Build aes128gcm header: salt (16) + rs (4) + idlen (1) + keyid (65)
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  const header = concatArrays(
    salt,
    rs,
    new Uint8Array([localPublicKeyRaw.length]),
    localPublicKeyRaw
  );

  const encrypted = concatArrays(header, ciphertext);
  return { encrypted, salt, localPublicKey: localPublicKeyRaw };
}

function concatArrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

// Send a single push notification
async function sendPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<{ success: boolean; status?: number; expired?: boolean }> {
  try {
    const url = new URL(endpoint);
    const audience = `${url.protocol}//${url.host}`;

    const jwt = await createVapidJwt(audience, vapidSubject, vapidPrivateKey);
    const { encrypted } = await encryptPayload(p256dh, auth, payload);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "TTL": "86400",
        "Authorization": `vapid t=${jwt}, k=${vapidPublicKey}`,
      },
      body: encrypted,
    });

    // 404 or 410 means subscription expired
    if (response.status === 404 || response.status === 410) {
      return { success: false, status: response.status, expired: true };
    }

    return { success: response.ok, status: response.status };
  } catch (err) {
    console.error("Push send error:", err);
    return { success: false };
  }
}

const REMINDER_MESSAGES = [
  "Time to learn your German words! 🇩🇪",
  "Your daily German practice awaits! 📚",
  "Don't break your streak! Study German today 🔥",
  "5 minutes of German = big progress! Let's go 💪",
  "Guten Morgen! Ready to learn some German? ☀️",
  "Your German vocabulary is waiting for you! 🎯",
  "Quick study session? Your future self will thank you! ⭐",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current hour in each timezone and find matching subscriptions
    // The cron runs every hour; we check which subscriptions match the current hour
    const now = new Date();

    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("active", true);

    if (error || !subscriptions) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions", sent: 0 }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sent = 0;
    let expired = 0;

    for (const sub of subscriptions) {
      // Check if current hour matches the reminder hour in the user's timezone
      const userTime = new Date(
        now.toLocaleString("en-US", { timeZone: sub.timezone || "Asia/Ho_Chi_Minh" })
      );
      const currentHour = userTime.getHours();

      if (currentHour !== sub.reminder_hour) continue;

      const message = REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)];
      const payload = JSON.stringify({
        title: "Vocabulary Study",
        body: message,
        url: "/",
      });

      const result = await sendPush(
        sub.endpoint,
        sub.keys_p256dh,
        sub.keys_auth,
        payload,
        vapidPublicKey,
        vapidPrivateKey,
        "mailto:vocabstudy@example.com"
      );

      if (result.success) {
        sent++;
      } else if (result.expired) {
        // Clean up expired subscriptions
        await supabase
          .from("push_subscriptions")
          .update({ active: false, updated_at: new Date().toISOString() })
          .eq("endpoint", sub.endpoint);
        expired++;
      }
    }

    return new Response(
      JSON.stringify({ sent, expired, total: subscriptions.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Send reminder error:", err);
    return new Response(
      JSON.stringify({ error: "Something went wrong" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
