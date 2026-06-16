import { SERVICES } from "../../services/index.js";

// Sanitises user-supplied values before inserting into innerHTML to prevent XSS.
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Local-only row identifier for keying dynamically added form rows — not security-sensitive.
function randomId() {
  return Math.random().toString(36).slice(2, 8);
}

function makeShortcutRow(s) {
  const row = document.createElement("div");
  row.className = "shortcut-row";
  row.dataset.id = s.id;
  row.innerHTML = `
    <input type="text"  class="shortcut-icon"  value="${esc(s.icon)}"  placeholder="🔗" maxlength="4" title="Icon (emoji)">
    <input type="text"  class="shortcut-label" value="${esc(s.label)}" placeholder="Label">
    <input type="url"   class="shortcut-url"   value="${esc(s.url)}"   placeholder="https://">
    <button type="button" class="btn-remove-shortcut" title="Remove">✕</button>
  `;
  row
    .querySelector(".btn-remove-shortcut")
    .addEventListener("click", () => row.remove());
  return row;
}

function makePackageRow(p) {
  const row = document.createElement("div");
  row.className = "package-row";
  row.dataset.id = p.id;
  row.innerHTML = `
    <input type="text"  class="package-label"  value="${esc(p.label)}"         placeholder="Label (e.g. Amazon)">
    <input type="text"  class="package-number" value="${esc(p.trackingNumber)}" placeholder="Tracking number" autocomplete="off" spellcheck="false">
    <button type="button" class="btn-remove-package" title="Remove">✕</button>
  `;
  row
    .querySelector(".btn-remove-package")
    .addEventListener("click", () => row.remove());
  return row;
}

function buildPackagesField(packages) {
  const field = document.createElement("div");
  field.className = "field";
  field.innerHTML = `<label>Packages</label>`;

  const list = document.createElement("div");
  list.id = "packages-list";
  for (const p of packages) list.appendChild(makePackageRow(p));
  field.appendChild(list);

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "btn-add-package";
  addBtn.textContent = "+ Add package";
  addBtn.addEventListener("click", () =>
    list.appendChild(makePackageRow({ id: randomId(), label: "", trackingNumber: "" }))
  );
  field.appendChild(addBtn);

  const hint = document.createElement("p");
  hint.className = "hint";
  hint.textContent = "Each manual refresh uses 1 Ship24 API credit per package (100 free/month).";
  field.appendChild(hint);

  return field;
}

function buildShortcutsSection(shortcuts) {
  const section = document.createElement("section");
  section.className = "settings-section";
  section.innerHTML = "<h2>⚡ Custom Shortcuts</h2>";

  const list = document.createElement("div");
  list.id = "shortcuts-list";
  for (const s of shortcuts) list.appendChild(makeShortcutRow(s));
  section.appendChild(list);

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.className = "btn-add-shortcut";
  addBtn.textContent = "+ Add shortcut";
  addBtn.addEventListener("click", () =>
    list.appendChild(
      makeShortcutRow({ id: randomId(), label: "", icon: "", url: "" }),
    ),
  );
  section.appendChild(addBtn);

  return section;
}

async function loadConfig() {
  const stored = await browser.storage.local.get("config");
  return stored.config ?? { theme: "default", services: {} };
}

function renderField(service, f, settings) {
  if (f.type === "separator") {
    return `<p class="field-separator">${esc(f.label ?? "")}</p>`;
  }

  if (f.type === "checkbox") {
    const checked =
      settings[f.key] !== undefined ? settings[f.key] : (f.default ?? false);
    return `
      <div class="field field--inline">
        <input type="checkbox" id="${esc(service.id)}-${esc(f.key)}" ${checked ? "checked" : ""}>
        <label for="${esc(service.id)}-${esc(f.key)}">${esc(f.label)}</label>
      </div>
    `;
  }

  return `
    <div class="field">
      <label for="${esc(service.id)}-${esc(f.key)}">${esc(f.label)}</label>
      <input
        type="${esc(f.type)}"
        id="${esc(service.id)}-${esc(f.key)}"
        value="${esc(settings[f.key] ?? "")}"
        placeholder="${esc(f.placeholder ?? "")}"
        autocomplete="off"
        spellcheck="false"
      >
      ${f.hint ? `<p class="hint">${esc(f.hint)}</p>` : ""}
    </div>
  `;
}

function applyTheme(slug) {
  document.getElementById("theme-stylesheet").href = `assets/css/${slug}.css`;
}

async function getThemeNames() {
  try {
    const res = await fetch(browser.runtime.getURL("assets/css/themes.json"));
    if (!res.ok) return ["default"];
    const names = await res.json();
    // Guard against malformed JSON or an empty list so the theme selector always has at least one option.
    return Array.isArray(names) && names.length ? names : ["default"];
  } catch {
    return ["default"];
  }
}

// Converts a File to a base64 data URL so it can be stored as a string in browser.storage.local.
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Reads the stored background image data URL, or null if none has been set.
async function loadBgImage() {
  const { bgImage } = await browser.storage.local.get('bgImage');
  return bgImage ?? null;
}

// Build the settings form dynamically from each service's configFields declaration.
function buildForm(config, themes, bgImage) {
  const root = document.getElementById("form-root");

  const current = config.theme ?? "default";
  const optionsHtml = themes
    .map(
      (n) =>
        `<option value="${esc(n)}"${n === current ? " selected" : ""}>${esc(n)}</option>`,
    )
    .join("");

  // base64 data URLs contain only A-Z, a-z, 0-9, +, /, = — safe to interpolate directly.
  const previewContent = bgImage
    ? `<img class="bg-preview-img" src="${bgImage}" alt="">`
    : `<span class="bg-preview-empty">None</span>`;

  const themeSection = document.createElement("section");
  themeSection.className = "settings-section";
  themeSection.innerHTML = `
    <h2>Appearance</h2>
    <div class="field">
      <label for="name">Your name</label>
      <input type="text" id="name" value="${esc(config.name ?? '')}" placeholder="e.g. Alex" autocomplete="off" spellcheck="false">
      <p class="hint">Shown as a greeting on the dashboard ("Good morning, Alex").</p>
    </div>
    <div class="field">
      <label for="theme">Theme</label>
      <select id="theme">${optionsHtml}</select>
    </div>
    <div class="field">
      <label>Background image</label>
      <div class="bg-image-row">
        <div class="bg-preview" id="bg-preview">${previewContent}</div>
        <div class="bg-image-btns">
          <button type="button" class="btn-upload-bg" id="btn-upload-bg">Upload</button>
          <button type="button" class="btn-remove-bg" id="btn-remove-bg"${bgImage ? "" : " hidden"}>Remove</button>
        </div>
      </div>
      <input type="file" id="bg-image-input" accept="image/*" style="display:none">
      <p class="hint">Shown behind the dashboard. Saved immediately when chosen.</p>
    </div>
  `;
  root.appendChild(themeSection);

  const weather = config.weather ?? {};
  const weatherSection = document.createElement("section");
  weatherSection.className = "settings-section";
  weatherSection.innerHTML = `
    <h2>🌤️ Weather</h2>
    <div class="field">
      <label for="weather-location">Location</label>
      <input type="text" id="weather-location" value="${esc(weather.location ?? "")}" placeholder="New York" autocomplete="off" spellcheck="false">
      <p class="hint">City name. Leave blank to hide weather.</p>
    </div>
    <div class="field field--inline">
      <input type="checkbox" id="weather-fahrenheit" ${weather.unit === "fahrenheit" ? "checked" : ""}>
      <label for="weather-fahrenheit">Use Fahrenheit</label>
    </div>
  `;
  root.appendChild(weatherSection);

  root.appendChild(buildShortcutsSection(config.shortcuts ?? []));

  // Services with configKey share another service's credentials — skip them here.
  const configurable = SERVICES.filter(
    (s) => !s.configKey && s.configFields?.length > 0,
  );
  for (const service of configurable) {
    const settings = config.services?.[service.id] ?? {};
    const section = document.createElement("section");
    section.className = "settings-section";
    const fieldsHtml = service.configFields
      .map((f) => renderField(service, f, settings))
      .join("");
    // cacheTtl is stored in seconds but shown/edited in minutes for readability.
    const defaultMinutes = Math.round(service.cacheTtl / 60);
    const currentMinutes =
      settings.cacheTtl != null
        ? Math.round(settings.cacheTtl / 60)
        : defaultMinutes;
    const ttlHtml = `
      <div class="field">
        <label for="${esc(service.id)}-ttl-minutes">Refresh interval</label>
        <div class="field-with-unit">
          <input type="number" id="${esc(service.id)}-ttl-minutes" min="1" step="1" value="${currentMinutes}">
          <span class="field-unit">min</span>
        </div>
        <p class="hint">Default: ${defaultMinutes} min</p>
      </div>
    `;
    section.innerHTML = `<h2>${service.icon} ${esc(service.label)}</h2>${fieldsHtml}${ttlHtml}`;
    if (service.hasPackages) {
      section.appendChild(buildPackagesField(settings.packages ?? []));
    }
    root.appendChild(section);
  }
}

// Read all form inputs back into a config object matching the config.json shape.
function collectConfig() {
  const name = document.getElementById("name")?.value.trim() ?? '';
  const theme = document.getElementById("theme").value.trim() || "default";
  const services = {};

  const configurable = SERVICES.filter(
    (s) => !s.configKey && s.configFields?.length > 0,
  );
  for (const service of configurable) {
    const entry = {};
    for (const f of service.configFields) {
      if (f.type === "separator") continue;
      const el = document.getElementById(`${service.id}-${f.key}`);
      if (!el) continue;
      entry[f.key] = f.type === "checkbox" ? el.checked : el.value.trim();
    }
    const ttlEl = document.getElementById(`${service.id}-ttl-minutes`);
    if (ttlEl) {
      const minutes = parseInt(ttlEl.value, 10);
      if (minutes > 0) entry.cacheTtl = minutes * 60;
    }
    if (service.hasPackages) {
      entry.packages = [...document.querySelectorAll(".package-row")]
        .map((row) => ({
          id: row.dataset.id,
          label: row.querySelector(".package-label").value.trim(),
          trackingNumber: row.querySelector(".package-number").value.trim(),
        }))
        .filter((p) => p.trackingNumber); // drop rows started but left without a number
    }
    services[service.id] = entry;
  }

  const shortcuts = [...document.querySelectorAll(".shortcut-row")]
    .map((row) => ({
      id: row.dataset.id,
      icon: row.querySelector(".shortcut-icon").value.trim(),
      label: row.querySelector(".shortcut-label").value.trim(),
      url: row.querySelector(".shortcut-url").value.trim(),
    }))
    .filter((s) => s.label && s.url); // icon is optional; both label and url required

  const weather = {
    location: document.getElementById("weather-location").value.trim(),
    unit: document.getElementById("weather-fahrenheit").checked
      ? "fahrenheit"
      : "celsius",
  };

  return { name, theme, services, shortcuts, weather };
}

// Entry point: loads stored config, builds the form, wires all event listeners.
(async () => {
  const backBtn = document.createElement("a");
  backBtn.href = browser.runtime.getURL("index.html");
  backBtn.className = "back-btn";
  backBtn.title = "Back to dashboard";
  backBtn.textContent = "← Dashboard";
  document.body.appendChild(backBtn);

  const [config, themes, bgImage] = await Promise.all([loadConfig(), getThemeNames(), loadBgImage()]);
  applyTheme(config.theme ?? "default");
  buildForm(config, themes, bgImage);

  document
    .getElementById("theme")
    ?.addEventListener("change", (e) => applyTheme(e.target.value));

  // Background image — saved/removed immediately, independent of the main Save button.
  const fileInput = document.getElementById("bg-image-input");
  const preview = document.getElementById("bg-preview");
  const removeBtn = document.getElementById("btn-remove-bg");

  document.getElementById("btn-upload-bg").addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    await browser.storage.local.set({ bgImage: dataUrl });
    preview.innerHTML = `<img class="bg-preview-img" src="${dataUrl}" alt="">`;
    removeBtn.hidden = false;
  });

  removeBtn.addEventListener("click", async () => {
    await browser.storage.local.remove("bgImage");
    preview.innerHTML = `<span class="bg-preview-empty">None</span>`;
    removeBtn.hidden = true;
    // Reset the input so the same file can be re-selected after removal.
    fileInput.value = "";
  });

  document.getElementById("save-btn").addEventListener("click", async () => {
    const status = document.getElementById("save-status");
    try {
      await browser.storage.local.set({ config: collectConfig() });
      status.textContent = "Saved!";
      status.className = "save-status save-status--ok";
    } catch (err) {
      status.textContent = "Save failed.";
      status.className = "save-status save-status--error";
      console.error(err);
    }
    setTimeout(() => {
      status.textContent = "";
      status.className = "save-status";
    }, 2000);
  });
})();
