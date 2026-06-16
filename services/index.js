/**
 * SERVICE OBJECT REFERENCE
 *
 * To add a new service, create a file in this directory, export a default
 * object matching the shape below, then import and add it to SERVICES.
 *
 * Required fields
 * ───────────────
 *  id          string   Unique slug. Used for DOM IDs, cache keys, and config keys.
 *  label       string   Display name shown in the card header.
 *  icon        string   Emoji fallback shown until the favicon loads.
 *  layout      string   Card template. One of:
 *                         'stat'          — single number + sublabel (most services)
 *                         'split'         — two side-by-side numbers (requires `stats`)
 *                         'agenda'        — list of { title, time } events (requires fetch → array)
 *                         'tracking'      — package list with manual-refresh button
 *                         'shortcut'      — icon + label link, no data fetch
 *  cardType    string   CSS modifier added as card--{cardType}. Pick an existing value
 *                       (social, tasks, chat, admin, calendar, tracking) or add a new
 *                       one to style.css if you need distinct styling.
 *  cacheTtl    number   Default cache lifetime in seconds.
 *  href        fn       (settings) => URL string. Destination when the card is clicked.
 *  required    string[] Config keys that must be non-empty and non-placeholder for the
 *                       card to appear. Use the same keys you read in `fetch`.
 *  configFields array   Fields rendered in the Settings UI. Each entry is one of:
 *                         { key, label, type: 'text'|'email'|'password'|'url'|'number',
 *                           placeholder?, hint? }
 *                         { key, label, type: 'checkbox', default?: boolean }
 *                         { type: 'separator', label? }
 *  fetch       async fn (settings) => value. Called with the user's saved config for
 *                       this service. Return a number for 'stat', an array of
 *                       { title, time } for 'agenda', or an array of package objects
 *                       for 'tracking'. Omit for shortcut-only cards.
 *
 * Optional fields
 * ───────────────
 *  sublabel    string   Small descriptor shown below the count (e.g. "notifications").
 *  configKey   string   Read credentials from config.services[configKey] instead of
 *                       config.services[id]. Use when two cards share one token set
 *                       (e.g. mastodon-admin shares mastodon's token).
 *  faviconDomain  string|fn  Override the domain used for favicon lookup. Useful when
 *                       the card URL has a path prefix that differs from the root domain,
 *                       or when the domain must be derived from settings (fn form).
 *  hasPackages bool     Set true to render the add/remove package-list UI in Settings.
 *  stats       array    Required for 'split' layout. Each entry:
 *                         { id, sublabel, key, href? }
 *                       `key` maps to a property on the object returned by `fetch`.
 *                       `href` is (settings) => URL for an independently-linked stat.
 *
 * Minimal example (single-stat card)
 * ───────────────────────────────────
 *  export default {
 *    id: 'myservice',
 *    label: 'My Service',
 *    icon: '🔔',
 *    layout: 'stat',
 *    cardType: 'tasks',
 *    cacheTtl: 300,
 *    sublabel: 'items',
 *    href: () => 'https://myservice.example.com',
 *    required: ['token'],
 *    configFields: [
 *      { key: 'token', label: 'API Token', type: 'password' },
 *    ],
 *    async fetch({ token }) {
 *      const data = await fetchJson('https://api.myservice.example.com/count', bearer(token));
 *      return data.count ?? 0;
 *    },
 *  };
 */

import fastmail from './fastmail.js';
import bluesky from './bluesky.js';
import mastodon from './mastodon.js';
import mastodonAdmin from './mastodon-admin.js';
import zulip from './zulip.js';
import patreon from './patreon.js';
import reader from './reader.js';
import trello from './trello.js';
import github from './github.js';
import gmail from './gmail.js';
import gcalendar from './gcalendar.js';
import tracking from './tracking.js';
import tumblr from './tumblr.js';
import furaffinity from './furaffinity.js';
import science from './science.js';

export const SERVICES = [
  fastmail,
  bluesky,
  mastodon,
  mastodonAdmin,
  zulip,
  patreon,
  reader,
  trello,
  github,
  gmail,
  gcalendar,
  tracking,
  tumblr,
  furaffinity,
  science,
];
