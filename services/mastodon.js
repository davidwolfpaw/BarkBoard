import { fetchJson, bearer } from '../assets/js/fetch.js';

export default {
  id: 'mastodon',
  label: 'Mastodon',
  icon: '🐘',
  layout: 'stat',
  cardType: 'social',
  cacheTtl: 120,
  sublabel: 'notifications',
  href: ({ instance }) => `https://${instance}/notifications`,
  required: ['token', 'instance'],
  configFields: [
    { key: 'instance', label: 'Instance', type: 'text', placeholder: 'mastodon.social', hint: 'Domain only, without https://' },
    { key: 'token', label: 'Access Token', type: 'password' }
  ],
  async fetch({ token, instance }) {
    const { count } = await fetchJson(
      `https://${instance}/api/v1/notifications/unread_count`,
      bearer(token)
    );
    return count ?? 0;
  }
};
