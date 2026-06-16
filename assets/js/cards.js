// shortcuts-list and tracking cards contain interactive elements so the card must be a <div>.
// All other cards are <a> elements that navigate on click.
export function renderCard(service, settings, size = {}) {
  const cols = size.cols ?? 1;
  const rows = size.rows ?? 1;
  const hasSplitLinks = service.layout === "split" && service.stats?.some((s) => s.href);
  const usesDiv = service.layout === "shortcuts-list" || service.layout === "tracking" || hasSplitLinks;

  const el = document.createElement(usesDiv ? "div" : "a");
  el.className = `card card--${service.cardType}`;
  if (cols > 1) el.classList.add(`card--span-${cols}`);
  if (rows > 1) el.classList.add(`card--row-${rows}`);
  el.dataset.service = service.id;
  if (!usesDiv) {
    el.href = service.href(settings);
  }

  const icon = `<div class="card-icon" id="${service.id}-icon">${service.icon}</div>`;
  const label = `<div class="card-label">${service.label}</div>`;
  // ⠿ is a Braille character that visually resembles a 2×3 dot drag handle.
  const handle = `<span class="card-drag-handle" draggable="true" aria-hidden="true">⠿</span>`;
  // Edge handles are invisible hit targets; CSS ::after adds the visible bar on hover.
  const edges = `
    <div class="card-edge-right" aria-hidden="true"></div>
    <div class="card-edge-bottom" aria-hidden="true"></div>
  `;

  if (service.layout === "shortcut") {
    el.classList.add("card--shortcut");
    el.innerHTML = icon + label + handle + edges;
  } else if (service.layout === "tracking") {
    el.innerHTML =
      icon +
      label +
      `<div class="card-tracking" id="${service.id}-tracking"><span class="tracking-empty">…</span></div>` +
      `<button class="card-refresh-btn" id="${service.id}-refresh" title="Refresh packages" type="button">↻</button>` +
      handle +
      edges;
  } else if (service.layout === "shortcuts-list") {
    const items = service.shortcuts
      .map(
        (s) =>
          `<li><a class="shortcut-item" href="${esc(s.url)}">
        <span class="shortcut-item-icon" id="si-${esc(s.id)}">${esc(s.icon)}</span>
        <span class="shortcut-item-label">${esc(s.label)}</span>
      </a></li>`,
      )
      .join("");
    el.innerHTML =
      label + `<ul class="shortcuts-grid">${items}</ul>` + handle + edges;
  } else if (service.layout === "agenda") {
    el.innerHTML =
      icon +
      label +
      `<div class="card-agenda" id="${service.id}-agenda"><span class="agenda-empty">…</span></div>` +
      handle +
      edges;
  } else if (service.layout === "split") {
    // Two side-by-side stats in one card (e.g. Mastodon Admin: pending + reports).
    // Each stat's DOM id comes from service.stats[n].id so runService can target them.
    // When a stat has its own href it renders as an <a> so each number links independently.
    el.classList.add("card--split");
    const stats = service.stats
      .map((s) => {
        const inner = `
          <span class="card-value" id="${s.id}">…</span>
          <span class="card-sublabel">${s.sublabel}</span>
        `;
        if (s.href) {
          const url = esc(s.href(settings));
          return `<a class="split-stat split-stat--link" href="${url}">${inner}</a>`;
        }
        return `<div class="split-stat">${inner}</div>`;
      })
      .join("");
    el.innerHTML =
      icon +
      label +
      `<div class="card-split-values">${stats}</div>` +
      handle +
      edges;
  } else {
    // Standard single-stat card. Id follows the convention "{service.id}-count".
    el.innerHTML =
      icon +
      label +
      `<div class="card-value" id="${service.id}-count">…</div>` +
      `<div class="card-sublabel">${service.sublabel}</div>` +
      handle +
      edges;
  }

  return el;
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Writes a fetched value into a card's stat element.
// Adds the has-items class when the count is a non-zero number so CSS can highlight it.
export function setCount(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value;
  if (typeof value === "number" && value > 0) el.classList.add("has-items");
}

// Renders a list of { label, milestone, location, url, eta, delivered } packages into a tracking card.
// Passing null shows an error dash; an empty array shows "No packages tracked".
export function setTracking(id, packages) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = "";
  if (!packages) {
    const span = document.createElement("span");
    span.className = "tracking-empty";
    span.textContent = "—";
    el.appendChild(span);
    return;
  }
  if (!packages.length) {
    const span = document.createElement("span");
    span.className = "tracking-empty";
    span.textContent = "No packages tracked";
    el.appendChild(span);
    return;
  }
  for (const pkg of packages) {
    const item = pkg.url
      ? Object.assign(document.createElement("a"), { href: pkg.url, target: "_blank", rel: "noopener noreferrer" })
      : document.createElement("div");
    item.className = "tracking-item";
    const labelEl = document.createElement("span");
    labelEl.className = "tracking-label";
    labelEl.textContent = pkg.label;
    const statusEl = document.createElement("span");
    statusEl.className = `tracking-status${pkg.delivered ? " tracking-status--delivered" : ""}`;
    statusEl.textContent = pkg.milestone ?? pkg.status;
    item.appendChild(labelEl);
    item.appendChild(statusEl);
    if (pkg.location) {
      const locationEl = document.createElement("span");
      locationEl.className = "tracking-location";
      locationEl.textContent = pkg.location;
      item.appendChild(locationEl);
    }
    if (pkg.eta) {
      const etaEl = document.createElement("span");
      etaEl.className = "tracking-eta";
      etaEl.textContent = pkg.eta;
      item.appendChild(etaEl);
    }
    el.appendChild(item);
  }
}

// Renders a list of { title, time } events into an agenda card.
// Passing null or an empty array shows a placeholder message.
export function setAgenda(id, events) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = "";
  if (!events || !events.length) {
    const span = document.createElement("span");
    span.className = "agenda-empty";
    span.textContent = events ? "No events today" : "—";
    el.appendChild(span);
    return;
  }
  for (const { title, time } of events) {
    const item = document.createElement("div");
    item.className = "agenda-item";
    const timeEl = document.createElement("span");
    timeEl.className = "agenda-time";
    timeEl.textContent = time;
    const titleEl = document.createElement("span");
    titleEl.className = "agenda-title";
    titleEl.textContent = title;
    item.appendChild(timeEl);
    item.appendChild(titleEl);
    el.appendChild(item);
  }
}
