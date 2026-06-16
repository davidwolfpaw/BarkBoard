import { AuthError } from "./fetch.js";

// Keyed by refresh_token so multiple Google services sharing the same account
// don't each trigger their own refresh call within the same page session.
const tokenCache = new Map();

export async function getGoogleToken(clientId, clientSecret, refreshToken) {
  const cached = tokenCache.get(refreshToken);
  if (cached && Date.now() < cached.expiry) return cached.token;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  // Any 4xx from the token endpoint means the credentials are wrong or revoked.
  if (res.status >= 400 && res.status < 500)
    throw new AuthError("google-oauth");
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);

  const { access_token, expires_in } = await res.json();
  // 60-second buffer before the actual expiry so we never use a token right as it expires.
  tokenCache.set(refreshToken, {
    token: access_token,
    expiry: Date.now() + (expires_in - 60) * 1000,
  });

  return access_token;
}
