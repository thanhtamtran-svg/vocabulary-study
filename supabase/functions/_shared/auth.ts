// Session-token validation shared by edge functions.
//
// Token scheme: HMAC-signed "vocab_auth:<expiresMs>:<sigHex>" issued by
// verify-password on app login, signed with SESSION_SECRET (fallback
// APP_PASSWORD). Historically this function was copy-pasted into each
// edge function; new functions should import from here instead so the
// scheme has one owner. (Existing copies in explain-word, sync-progress,
// upload-image, generate-* still work — migrate them opportunistically.)

export async function validateAuthToken(req: Request): Promise<boolean> {
  try {
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return false;
    const token = authHeader.slice(7);
    const parts = token.split(":");
    if (parts.length < 3 || parts[0] !== "vocab_auth") return false;
    const expires = parseInt(parts[1], 10);
    if (isNaN(expires) || Date.now() > expires) return false;
    const payload = parts[0] + ":" + parts[1];
    const sigHex = parts.slice(2).join(":");
    const secret = Deno.env.get("SESSION_SECRET") || Deno.env.get("APP_PASSWORD") || "default";
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(secret + "_session_key"),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
    );
    const expectedSig = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
    const expectedHex = Array.from(expectedSig).map(b => b.toString(16).padStart(2, "0")).join("");
    return sigHex === expectedHex;
  } catch {
    return false;
  }
}
