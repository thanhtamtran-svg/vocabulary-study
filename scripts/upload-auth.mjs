// Shared login helper for the image-upload scripts.
//
// The upload-image edge function requires a session token (it upserts
// shared vocab images, so writes are owner-only). This helper exchanges
// the app password for a token via the verify-password edge function.
//
// The password is read from, in order:
//   1. the APP_PASSWORD environment variable
//   2. a line "APP_PASSWORD=..." in .env at the repo root (git-ignored)
//
// Returns headers to spread into the upload fetch call:
//   const authHeader = await getAuthHeader(SUPABASE_URL);
//   fetch(url, { headers: { 'Content-Type': 'application/json', ...authHeader } })
import { readFileSync, existsSync } from 'fs';

export async function getAuthHeader(supabaseUrl) {
  let password = process.env.APP_PASSWORD || '';
  if (!password && existsSync('.env')) {
    const line = readFileSync('.env', 'utf-8')
      .split(/\r?\n/)
      .find(l => l.startsWith('APP_PASSWORD='));
    if (line) password = line.slice('APP_PASSWORD='.length).trim();
  }
  if (!password) {
    throw new Error(
      'APP_PASSWORD not found. Set the APP_PASSWORD environment variable, ' +
      'or create a .env file at the repo root containing:\n  APP_PASSWORD=your-app-password'
    );
  }
  const res = await fetch(supabaseUrl + '/functions/v1/verify-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok || !data.token) {
    throw new Error('Login failed: ' + (data.error || 'incorrect password'));
  }
  return { Authorization: 'Bearer ' + data.token };
}
