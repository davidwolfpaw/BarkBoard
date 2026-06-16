import { renderCard, setCount, setAgenda, setTracking } from "./cards.js";
import { SERVICES } from "../../services/index.js";
import { readCache, writeCache, isFresh } from "./cache.js";
import { AuthError } from "./fetch.js";
import { loadLayout, saveLayout, applyOrder } from "./layout.js";
import { getFavicon } from "./favicon.js";
import { getWeather } from "./weather.js";
import { getAirQuality } from "./airquality.js";

// Holds the configured name so updateClock can include it in the greeting.
// Set after config loads; empty string means no greeting is shown.
let greetingName = '';

// Returns a time-of-day salutation based on the current hour.
function getGreetingPhrase() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

function updateClock() {
  const now = new Date();
  document.getElementById("clock").textContent = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  document.getElementById("date").textContent = now.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  // Greeting re-evaluates every tick so it switches automatically at the hour boundary.
  const greetingEl = document.getElementById("greeting");
  if (greetingEl) {
    greetingEl.textContent = greetingName ? `${getGreetingPhrase()}, ${greetingName}` : '';
  }
}

// Swaps the theme stylesheet to css/{slug}.css. Called immediately after config loads
// so the correct variables are in place before cards are rendered.
function applyTheme(slug) {
  document.getElementById("theme-stylesheet").href = `assets/css/${slug}.css`;
}

// Applies a stored background image to the body.
// background-attachment: fixed keeps the image stationary when the grid is taller than the viewport.
function applyBgImage(dataUrl) {
  document.body.style.backgroundImage = `url(${dataUrl})`;
  document.body.style.backgroundSize = "cover";
  document.body.style.backgroundPosition = "center";
  document.body.style.backgroundAttachment = "fixed";
}

async function loadConfig() {
  const stored = await browser.storage.local.get("config");
  return stored.config ?? {};
}

// Returns the settings object for a service from config.services.
// Uses service.configKey when set (e.g. mastodon-admin shares mastodon's credentials).
function getSettings(service, config) {
  return config.services?.[service.configKey ?? service.id] ?? {};
}

// A service is considered configured when all of its required keys are present
// in its settings object and haven't been left as placeholder "YOUR_*" values.
function isConfigured(service, settings) {
  return service.required.every(
    (key) => settings[key] && !String(settings[key]).startsWith("YOUR_"),
  );
}

// Writes a fetch result into the card DOM. Split cards map result keys to individual stat elements.
function applyResult(service, result) {
  if (service.layout === "split") {
    service.stats.forEach((s) => setCount(s.id, result[s.key]));
  } else if (service.layout === "agenda") {
    setAgenda(`${service.id}-agenda`, result);
  } else if (service.layout === "tracking") {
    setTracking(`${service.id}-tracking`, result);
  } else {
    setCount(`${service.id}-count`, result);
  }
}

// Shows an em dash when a fetch fails and no cache is available to fall back on.
function applyError(service) {
  if (service.layout === "split") {
    service.stats.forEach((s) => setCount(s.id, "—"));
  } else if (service.layout === "agenda") {
    setAgenda(`${service.id}-agenda`, null);
  } else if (service.layout === "tracking") {
    setTracking(`${service.id}-tracking`, null);
  } else {
    setCount(`${service.id}-count`, "—");
  }
}

// Marks the card with a red tint and tooltip when credentials are rejected (401/403).
function applyAuthError(service) {
  const card = document.querySelector(`[data-service="${service.id}"]`);
  if (card) {
    card.classList.add("card--auth-error");
    card.title = "Credentials invalid — open Settings to fix";
  }
  applyError(service);
}

// Runs a single service: uses cached data if still fresh, otherwise fetches live.
// On fetch failure, falls back to stale cache rather than showing an error.
// Auth failures (401/403) skip the stale-cache fallback and surface visually instead.
async function runService(service, settings) {
  if (service.layout === "shortcut" || !service.fetch) return;

  const cached = readCache(service.id);
  const validShape =
    service.layout !== "agenda" || Array.isArray(cached?.value);
  if (isFresh(cached, settings.cacheTtl ?? service.cacheTtl) && validShape) {
    applyResult(service, cached.value);
    return;
  }

  try {
    const result = await service.fetch(settings);
    writeCache(service.id, result);
    applyResult(service, result);
  } catch (err) {
    console.error(`${service.id}:`, err);
    if (err instanceof AuthError) {
      applyAuthError(service);
    } else {
      // Prefer stale data over an error state — the count was probably still accurate.
      cached ? applyResult(service, cached.value) : applyError(service);
    }
  }
}

// Converts saved shortcut entries from config into a single consolidated card.
// Returns an empty array when there are no shortcuts, so no card is rendered.
function shortcutServices(config) {
  const shortcuts = (config.shortcuts ?? []).filter((s) => s.label && s.url);
  if (!shortcuts.length) return [];
  return [
    {
      id: "shortcuts",
      label: "Shortcuts",
      layout: "shortcuts-list",
      cardType: "shortcuts",
      shortcuts,
      required: [],
    },
  ];
}

// Returns the nearest valid span (1–max) for a given pixel size,
// snapping at the midpoint between each pair of adjacent valid sizes.
function snapSpan(pixels, unitSize, gap, max) {
  for (let n = 1; n < max; n++) {
    const lo = n * unitSize + (n - 1) * gap;
    const hi = (n + 1) * unitSize + n * gap;
    if (pixels < (lo + hi) / 2) return n;
  }
  return max;
}

// Sets up drag-resize on a card's right edge (column span) and bottom edge (row span).
// Uses mousedown/mousemove/mouseup rather than the HTML5 drag API to avoid conflicts
// with the card's own draggable="true" for reordering.
function setupEdgeDrag(card, serviceId, grid, layout) {
  const onMouseDown = (isRightEdge, e) => {
    e.preventDefault();
    e.stopPropagation();
    const handle = card.querySelector(".card-drag-handle");
    if (handle) handle.draggable = false; // disable reorder drag while resizing

    const style = getComputedStyle(grid);
    const colGap = parseFloat(style.columnGap) || 14;
    const rowGap = parseFloat(style.rowGap) || 14;
    const colWidth = (grid.clientWidth - colGap * 3) / 4; // 4-column grid
    const rowHeight = 150;

    let moved = false;

    const onMove = (e) => {
      moved = true;
      const rect = card.getBoundingClientRect();
      if (isRightEdge) {
        const cols = snapSpan(e.clientX - rect.left, colWidth, colGap, 4);
        card.classList.remove("card--span-2", "card--span-3", "card--span-4");
        if (cols > 1) card.classList.add(`card--span-${cols}`);
      } else {
        const rows = snapSpan(e.clientY - rect.top, rowHeight, rowGap, 3);
        card.classList.remove("card--row-2", "card--row-3");
        if (rows > 1) card.classList.add(`card--row-${rows}`);
      }
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      if (handle) handle.draggable = true;

      // Eat the click that fires after mouseup so the card anchor doesn't navigate.
      if (moved)
        card.addEventListener("click", (e) => e.preventDefault(), {
          once: true,
          capture: true,
        });

      // Read final state from card classes and save.
      const cols = card.classList.contains("card--span-4")
        ? 4
        : card.classList.contains("card--span-3")
          ? 3
          : card.classList.contains("card--span-2")
            ? 2
            : 1;
      const rows = card.classList.contains("card--row-3")
        ? 3
        : card.classList.contains("card--row-2")
          ? 2
          : 1;

      const size = {};
      if (cols > 1) size.cols = cols;
      if (rows > 1) size.rows = rows;

      if (!Object.keys(size).length) delete layout.sizes[serviceId];
      else layout.sizes[serviceId] = size;

      saveLayout(layout).catch(console.error);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  card
    .querySelector(".card-edge-right")
    ?.addEventListener("mousedown", (e) => onMouseDown(true, e));
  card
    .querySelector(".card-edge-bottom")
    ?.addEventListener("mousedown", (e) => onMouseDown(false, e));
}

// Sets up drag-to-reorder using event delegation on the grid element.
// dragstart/dragend/dragover/dragleave/drop are all handled here to avoid
// adding O(n) listeners when cards are re-appended during a drop.
function setupDrag(grid, layout) {
  let dragSrc = null;

  grid.addEventListener("dragstart", (e) => {
    const card = e.target.closest("[data-service]");
    if (!card) return;
    dragSrc = card.dataset.service;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", dragSrc);
    // Defer so the browser captures the ghost image before the card fades.
    setTimeout(() => card.classList.add("dragging"), 0);
  });

  grid.addEventListener("dragend", () => {
    grid
      .querySelectorAll("[data-service]")
      .forEach((c) => c.classList.remove("dragging", "drag-over"));
    dragSrc = null;
  });

  grid.addEventListener("dragover", (e) => {
    if (!dragSrc) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const card = e.target.closest("[data-service]");
    if (!card || card.dataset.service === dragSrc) return;
    grid
      .querySelectorAll(".drag-over")
      .forEach((c) => c.classList.remove("drag-over"));
    card.classList.add("drag-over");
  });

  grid.addEventListener("dragleave", (e) => {
    const card = e.target.closest("[data-service]");
    if (card && !card.contains(e.relatedTarget))
      card.classList.remove("drag-over");
  });

  grid.addEventListener("drop", (e) => {
    e.preventDefault();
    const dstCard = e.target.closest("[data-service]");
    if (!dstCard || !dragSrc || dstCard.dataset.service === dragSrc) return;

    const dstId = dstCard.dataset.service;
    const cards = [...grid.querySelectorAll("[data-service]")];
    const order = cards.map((c) => c.dataset.service);

    // Remove the dragged card from its current position.
    order.splice(order.indexOf(dragSrc), 1);

    // Insert before or after the drop target based on which half was hovered.
    const dstIdx = order.indexOf(dstId);
    const after =
      e.clientX >
      dstCard.getBoundingClientRect().left + dstCard.offsetWidth / 2;
    order.splice(after ? dstIdx + 1 : dstIdx, 0, dragSrc);

    // Re-append in new order — appendChild moves existing nodes, no clone needed.
    const cardMap = Object.fromEntries(
      cards.map((c) => [c.dataset.service, c]),
    );
    order.forEach((id) => cardMap[id] && grid.appendChild(cardMap[id]));

    layout.order = order;
    saveLayout(layout).catch(console.error);

    dstCard.classList.remove("drag-over");
    dragSrc = null;
  });
}

// service.faviconDomain can be a function (e.g. Zulip strips subdomains to get the root domain),
// a static string, or absent — in which case the domain is parsed from service.href().
function resolveFaviconDomain(service, settings) {
  if (typeof service.faviconDomain === "function")
    return service.faviconDomain(settings);
  if (typeof service.faviconDomain === "string") return service.faviconDomain;
  try {
    return new URL(service.href(settings)).hostname;
  } catch {
    return null;
  }
}

(async () => {
  updateClock();
  setInterval(updateClock, 1000);

  // Settings button — always visible in the header so the options page is always reachable.
  const settingsBtn = document.createElement("button");
  settingsBtn.className = "settings-btn";
  settingsBtn.title = "Settings";
  settingsBtn.textContent = "⚙";
  settingsBtn.addEventListener("click", () =>
    browser.runtime.openOptionsPage(),
  );
  document.body.appendChild(settingsBtn);

  // Load config, layout, and background image in parallel — all independent storage keys.
  const [config, layout, { bgImage }] = await Promise.all([
    loadConfig(),
    loadLayout(),
    browser.storage.local.get("bgImage"),
  ]);
  applyTheme(config.theme ?? "default");
  if (bgImage) applyBgImage(bgImage);
  greetingName = config.name ?? '';
  updateClock(); // re-run immediately so the greeting appears without waiting for the next tick

  if (config.weather?.location) {
    getWeather(config.weather.location, config.weather.unit ?? "celsius")
      .then((data) => {
        if (!data) return;
        const el = document.getElementById("weather");
        if (el)
          el.textContent = `${data.icon} ${data.temp}${data.unit} · ${data.label}`;
      })
      .catch((err) => console.error("Weather:", err));

    getAirQuality(config.weather.location)
      .then((data) => {
        if (!data) return;
        const el = document.getElementById("airquality");
        if (!el) return;
        let text = `${data.icon} AQI ${data.aqi} · ${data.label}`;
        if (data.pollen) text += ` · ${data.pollen}`;
        el.textContent = text;
      })
      .catch((err) => console.error("Air quality:", err));
  }

  const grid = document.getElementById("grid");
  const active = [
    ...SERVICES.filter((s) => isConfigured(s, getSettings(s, config))),
    ...shortcutServices(config),
  ];

  if (active.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.appendChild(document.createTextNode("No services configured. "));
    const link = document.createElement("button");
    link.className = "empty-state-link";
    link.textContent = "Open Settings";
    link.addEventListener("click", () => browser.runtime.openOptionsPage());
    empty.appendChild(link);
    grid.appendChild(empty);
    return;
  }

  // Cards are inserted synchronously so the grid is visible before any fetches complete.
  for (const service of applyOrder(active, layout.order)) {
    const size = layout.sizes[service.id] ?? service.defaultSize ?? {};
    const card = renderCard(service, getSettings(service, config), size);
    grid.appendChild(card);
    setupEdgeDrag(card, service.id, grid, layout);
  }

  // Load favicons in background — cards already show emoji as fallback.
  for (const service of active) {
    if (service.layout === "shortcuts-list") {
      // For shortcut items, only load a favicon when the user left the icon blank.
      for (const s of service.shortcuts) {
        if (s.icon) continue;
        let domain;
        try {
          domain = new URL(s.url).hostname;
        } catch {
          continue;
        }
        getFavicon(domain).then((dataUrl) => {
          if (!dataUrl) return;
          const el = document.getElementById(`si-${s.id}`);
          if (!el) return;
          const img = document.createElement("img");
          img.src = dataUrl;
          img.alt = "";
          img.width = 18;
          img.height = 18;
          el.replaceChildren(img);
        });
      }
      continue;
    }
    const settings = getSettings(service, config);
    const domain = resolveFaviconDomain(service, settings);
    if (!domain) continue;
    getFavicon(domain).then((dataUrl) => {
      if (!dataUrl) return;
      const el = document.getElementById(`${service.id}-icon`);
      if (!el) return;
      const img = document.createElement("img");
      img.src = dataUrl;
      img.alt = service.label;
      img.width = 22;
      img.height = 22;
      el.replaceChildren(img);
    });
  }

  setupDrag(grid, layout);

  // Wire the manual refresh button for the tracking card — bypasses cache on click.
  const trackingService = active.find((s) => s.id === "tracking");
  if (trackingService) {
    const refreshBtn = document.getElementById("tracking-refresh");
    refreshBtn?.addEventListener("click", async () => {
      refreshBtn.classList.add("spinning");
      try {
        const settings = getSettings(trackingService, config);
        const result = await trackingService.fetch(settings);
        writeCache("tracking", result);
        applyResult(trackingService, result);
      } catch (err) {
        console.error("tracking refresh:", err);
        applyError(trackingService);
      } finally {
        refreshBtn.classList.remove("spinning");
      }
    });
  }

  // All services fetch in parallel; one failure doesn't block the others.
  await Promise.allSettled(
    active.map((s) => runService(s, getSettings(s, config))),
  );
})();
