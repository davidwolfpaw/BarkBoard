import { fetchJson, formPost } from '../assets/js/fetch.js';

export default {
  id: 'zulip',
  label: 'Zulip',
  icon: '💬',
  layout: 'stat',
  cardType: 'chat',
  cacheTtl: 300,
  sublabel: 'unread',
  href: ({ instance }) => `https://${instance}/`,
  faviconDomain: ({ instance }) => instance.split('.').slice(-2).join('.'),
  required: ['email', 'api_key', 'instance'],
  configFields: [
    { key: 'instance', label: 'Instance', type: 'text', placeholder: 'yourorg.zulipchat.com', hint: 'Domain only, without https://' },
    { key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
    { key: 'api_key', label: 'API Key', type: 'password' }
  ],
  async fetch({ email, api_key, instance }) {
    const data = await fetchJson(
      `https://${instance}/api/v1/register`,
      formPost(email, api_key, {})
    );
    const unread = data.unread_msgs;
    if (!unread) return 0;
    if (typeof unread.count === 'number') return unread.count;
    // Fallback: sum from sub-arrays for older Zulip versions
    let total = 0;
    for (const pm of unread.pms ?? []) total += pm.unread_message_ids?.length ?? 0;
    for (const stream of unread.streams ?? []) total += stream.unread_message_ids?.length ?? 0;
    for (const huddle of unread.huddles ?? []) total += huddle.unread_message_ids?.length ?? 0;
    return total;
  }
};
