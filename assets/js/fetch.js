// Thrown for 401/403 responses so callers can distinguish credential failures
// from other errors and surface them visually rather than silently falling back.
export class AuthError extends Error {
  constructor(url) {
    super(`Authentication failed: ${url}`);
    this.name = "AuthError";
  }
}

// Throws on non-2xx so service fetch functions don't need to check res.ok themselves.
// 401/403 throw AuthError so credential failures can be shown differently in the UI.
export async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (res.status === 401 || res.status === 403) throw new AuthError(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Each helper returns a complete fetch options object so it can be passed directly
// to fetchJson or spread when extra options (method, body) are also needed.

// Standard OAuth2 Bearer token — used by most REST APIs.
export const bearer = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

// "Token"-prefixed auth — used by Readwise and some Django REST APIs.
export const tokenAuth = (token) => ({
  headers: { Authorization: `Token ${token}` },
});

// POST with a JSON body and Bearer auth — used by JMAP (Fastmail).
export const jsonPost = (token, body) => ({
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(body),
});

// POST with a URL-encoded form body and Basic auth — used by Zulip's register endpoint.
export const formPost = (user, pass, params) => ({
  method: "POST",
  headers: {
    Authorization: `Basic ${btoa(`${user}:${pass}`)}`,
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: new URLSearchParams(params),
});
