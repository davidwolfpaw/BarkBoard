import { fetchJson, bearer } from '../assets/js/fetch.js';

export default {
  id: 'mastodon-admin',
  configKey: 'mastodon', // shares credentials with the mastodon service — one token covers both cards
  label: 'Mastodon Admin',
  icon: '🛡️',
  layout: 'split',
  cardType: 'admin',
  cacheTtl: 300,
  href: ({ instance }) => `https://${instance}/admin/reports`,
  required: ['token', 'instance'],
  stats: [
    {
      id: 'mastodon-pending',
      sublabel: 'pending',
      key: 'pending',
      href: ({ instance }) => `https://${instance}/admin/accounts?origin=local&status=pending`,
    },
    {
      id: 'mastodon-reports',
      sublabel: 'reports',
      key: 'reports',
      href: ({ instance }) => `https://${instance}/admin/reports`,
    },
  ],
  async fetch({ token, instance }) {
    const base = `https://${instance}`;
    const opts = bearer(token);
    const [pending, reports] = await Promise.all([
      fetchJson(`${base}/api/v2/admin/accounts?status=pending&limit=40`, opts),
      fetchJson(`${base}/api/v1/admin/reports?limit=40`, opts)
    ]);
    return {
      pending: Array.isArray(pending) ? pending.length : 0,
      reports: Array.isArray(reports) ? reports.length : 0
    };
  }
};
