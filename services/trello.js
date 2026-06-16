import { fetchJson } from '../assets/js/fetch.js';

export default {
  id: 'trello',
  label: 'Trello',
  icon: '📋',
  layout: 'stat',
  cardType: 'tasks',
  cacheTtl: 120,
  sublabel: 'notifications',
  href: () => 'https://trello.com/',
  required: ['api_key', 'token'],
  configFields: [
    { key: 'api_key', label: 'API Key', type: 'text' },
    { key: 'token', label: 'Token', type: 'password' }
  ],
  async fetch({ api_key, token }) {
    // Trello passes credentials as query params — this endpoint doesn't support header-based auth.
    const data = await fetchJson(
      `https://api.trello.com/1/members/me/notifications?read_filter=unread&key=${api_key}&token=${token}`
    );
    return Array.isArray(data) ? data.length : 0;
  }
};
