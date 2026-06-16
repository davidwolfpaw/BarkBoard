const PREFIX = "favicon_";
// Favicons are stable; a week between refreshes avoids hammering the CDN on every new tab.
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function readCache(domain) {
  try {
    const raw = localStorage.getItem(PREFIX + domain);
    if (!raw) return null;
    const { dataUrl, ts } = JSON.parse(raw);
    return Date.now() - ts < TTL_MS ? dataUrl : null;
  } catch {
    return null;
  }
}

function writeCache(domain, dataUrl) {
  try {
    localStorage.setItem(
      PREFIX + domain,
      JSON.stringify({ dataUrl, ts: Date.now() }),
    );
  } catch {}
}

// Converts the response blob to a data URI so it can be stored as a string in localStorage.
async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Returns a cached or freshly fetched data URI for the domain's favicon, or null on failure.
// Google's S2 service is used as a reliable cross-origin favicon CDN with broad site coverage.
export async function getFavicon(domain) {
  const cached = readCache(domain);
  if (cached) return cached;
  try {
    const res = await fetch(
      `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    );
    if (!res.ok) return null;
    const dataUrl = await blobToDataUrl(await res.blob());
    writeCache(domain, dataUrl);
    return dataUrl;
  } catch {
    return null;
  }
}
