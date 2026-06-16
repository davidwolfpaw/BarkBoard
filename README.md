# BarkBoard - Personal Dashboard

A browser extension that replaces the new-tab page with a personal stats dashboard. Cards show unread counts, upcoming calendar events, package tracking, and custom shortcuts — all pulling live data from your own API credentials stored locally in the extension.

Built for Firefox; also works in Chrome 120+ (Manifest V3).

---

## Features

- **Service cards** — Bluesky, Fastmail, FurAffinity, GitHub, Gmail, Google Calendar, Mastodon (+ admin), Patreon, Reader (Readwise), Trello, Tumblr, Zulip
- **Science card** — aurora/Kp index, significant earthquakes, NWS weather alerts, drought monitor (USDM), and air quality in a single vertical-list card; no API keys required
- **Package tracking** — Ship24 aggregator with manual refresh
- **Custom shortcuts** — icon + label links laid out in a grid
- **Weather + air quality** — current conditions and AQI via Open-Meteo (no API key required)
- **Drag-to-reorder** and **edge-drag resize** for every card
- **Themes** — swap colour schemes from Settings; add your own CSS file
- **Background image** — upload any image; stored locally, never leaves the browser

---

## Installation

### Firefox (temporary)

1. Open `about:debugging` → **This Firefox** → **Load Temporary Add-on**
2. Select `manifest.json` from this directory
3. Open a new tab — the dashboard appears immediately

The extension unloads when Firefox closes. Reload it after each restart until you sign it or load it permanently.

### Firefox (permanent, unsigned)

Enable unsigned extensions in `about:config` → set `xpinstall.signatures.required = false`, then install the `.xpi` produced by `web-ext build`.

### Chrome / Chromium

1. Open `chrome://extensions` → enable **Developer mode**
2. Click **Load unpacked** and select this directory

---

## Getting started

1. Install the extension and open a new tab
2. Click the **⚙** gear icon (top-right) to open Settings
3. Fill in credentials for any services you use — each section shows only the fields that service needs
4. Click **Save**
5. Return to the new tab — configured cards appear automatically

Credentials are stored in `browser.storage.local` (on-device, encrypted by the browser profile). Nothing is sent anywhere except the service APIs you configure.

---

## Configuration reference

| Setting | Where | Notes |
|---|---|---|
| Name | Appearance | Shown in the time-of-day greeting |
| Theme | Appearance | Loads `assets/css/{slug}.css` |
| Background image | Appearance | Stored as a base64 data URL |
| Weather location | Weather | City name; leave blank to hide |
| Custom shortcuts | Shortcuts | Each shortcut needs a label and URL |
| Service credentials | Per-service section | See each service's own fields |
| Refresh interval | Per-service section | Overrides the service default |

---

## Adding a new service

All services live in `services/`. Adding one is three steps:

### 1. Create the service file

```js
// services/myservice.js
import { fetchJson, bearer } from '../assets/js/fetch.js';

export default {
  id: 'myservice',          // unique slug — used for DOM IDs and cache keys
  label: 'My Service',      // display name in the card header
  icon: '🔔',               // emoji fallback (shown until favicon loads)
  layout: 'stat',           // card template — see Layouts below
  cardType: 'tasks',        // CSS modifier: card--tasks
  cacheTtl: 300,            // default cache lifetime in seconds
  sublabel: 'items',        // small descriptor below the count
  href: () => 'https://myservice.example.com',
  required: ['token'],      // keys that must be filled in for the card to show
  configFields: [
    { key: 'token', label: 'API Token', type: 'password' },
  ],
  async fetch({ token }) {
    const data = await fetchJson(
      'https://api.myservice.example.com/count',
      bearer(token)
    );
    return data.count ?? 0;
  },
};
```

### 2. Register it in `services/index.js`

```js
import myservice from './myservice.js';

export const SERVICES = [
  // ... existing services ...
  myservice,
];
```

### 3. Done

Reload the extension, open Settings, fill in the token, save — the card appears on the next new tab.

---

## Card layouts

| Layout | `fetch` returns | Use for |
|---|---|---|
| `stat` | `number` | Single count (notifications, issues, emails…) |
| `split` | `{ key1, key2, … }` | Two side-by-side numbers in one card (requires `stats` array) |
| `agenda` | `[{ title, time }]` | Vertical two-column list (calendar events, science data) |
| `tracking` | `[{ label, milestone, location?, url?, eta?, delivered }]` | Package list with manual-refresh button |
| `shortcut` | *(no fetch)* | Icon + label link only |

### `split` layout example

```js
layout: 'split',
stats: [
  { id: 'myservice-open',   sublabel: 'open',   key: 'open' },
  { id: 'myservice-closed', sublabel: 'closed', key: 'closed',
    href: (settings) => `https://myservice.example.com/${settings.org}/closed` },
],
async fetch({ token }) {
  return { open: 12, closed: 4 };
}
```

---

## Fetch helpers (`assets/js/fetch.js`)

| Helper | Auth style | Used by |
|---|---|---|
| `bearer(token)` | `Authorization: Bearer …` | Most REST APIs |
| `tokenAuth(token)` | `Authorization: Token …` | Readwise, some Django APIs |
| `jsonPost(token, body)` | Bearer + JSON body | JMAP (Fastmail) |
| `formPost(user, pass, params)` | Basic auth + form body | Zulip |

All helpers return a plain options object you pass directly to `fetchJson`:

```js
const data = await fetchJson(url, bearer(token));
// or spread when you need extra options:
const data = await fetchJson(url, { ...bearer(token), signal: abortSignal });
```

`fetchJson` throws `AuthError` (a subclass of `Error`) on 401/403 — the dashboard catches this and shows a red tint on the card rather than silently falling back to stale data.

---

## Themes

Themes are plain CSS files in `assets/css/` that define a set of CSS custom properties consumed by `style.css`. `assets/css/themes.json` lists available theme slugs.

To add a theme:

1. Copy `assets/css/default.css` to `assets/css/mytheme.css`
2. Edit the custom properties (`--bg`, `--card-bg`, `--text`, etc.)
3. Add `"mytheme"` to `assets/css/themes.json`
4. Select it in Settings → Appearance → Theme

---

## Development

```bash
npm install           # install lint dependencies
npm run lint          # JS (ESLint) + CSS (Stylelint) + HTML (HTMLHint)
npm run lint:fix      # auto-fix JS and CSS issues
```

No build step — the extension runs directly from source files. Reload it in `about:debugging` after editing JS or CSS.

### Project structure

```
assets/
  css/          Stylesheets — style.css is the base, others are themes
  js/
    main.js     Entry point — wires everything together
    cards.js    DOM rendering for each card layout
    cache.js    localStorage read/write/freshness helpers
    fetch.js    fetchJson + auth option helpers
    layout.js   Card order + size persistence
    options.js  Settings page logic
    favicon.js  Favicon fetching and caching
    weather.js  Open-Meteo weather fetch
    airquality.js  Open-Meteo air quality fetch
    google-auth.js OAuth2 token refresh for Google APIs
services/
  index.js      SERVICES array + service object reference
  *.js          One file per service
index.html      New-tab page
options.html    Settings page
manifest.json   Extension manifest (Manifest V3)
```
