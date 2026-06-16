import { fetchJson, bearer } from '../assets/js/fetch.js';

export default {
  id: 'bluesky',
  label: 'Bluesky',
  icon: '🦋',
  layout: 'stat',
  cardType: 'social',
  cacheTtl: 120,
  sublabel: 'notifications',
  href: () => 'https://bsky.app/notifications',
  required: ['identifier', 'app_password'],
  configFields: [
    { key: 'identifier', label: 'Handle', type: 'text', placeholder: 'you.bsky.social' },
    { key: 'app_password', label: 'App Password', type: 'password', placeholder: 'xxxx-xxxx-xxxx-xxxx' }
  ],
  async fetch({ identifier, app_password }) {
    // AT Protocol has no persistent OAuth token — a new session must be created on every fetch.
    const { accessJwt } = await fetchJson(
      'https://bsky.social/xrpc/com.atproto.server.createSession',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password: app_password })
      }
    );
    const { count } = await fetchJson(
      'https://bsky.social/xrpc/app.bsky.notification.getUnreadCount',
      bearer(accessJwt)
    );
    return count ?? 0;
  }
};
