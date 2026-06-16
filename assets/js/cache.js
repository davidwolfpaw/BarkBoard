// Prefix all keys so dashboard entries are easy to identify and clear in DevTools.
const PREFIX = "dash_";

// Returns the parsed cache entry { value, ts } or null if missing/corrupt.
export function readCache(id) {
  try {
    const raw = localStorage.getItem(PREFIX + id);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Stores a value alongside the current timestamp so freshness can be checked later.
export function writeCache(id, value) {
  try {
    localStorage.setItem(
      PREFIX + id,
      JSON.stringify({ value, ts: Date.now() }),
    );
  } catch {}
}

// Returns true if the entry exists and was written within the last ttlSeconds seconds.
// Each service sets its own cacheTtl — see the individual file in js/services/.
export function isFresh(entry, ttlSeconds) {
  return entry !== null && Date.now() - entry.ts < ttlSeconds * 1000;
}
