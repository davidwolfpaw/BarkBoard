import { fetchJson, tokenAuth } from '../assets/js/fetch.js';

export default {
  id: 'reader',
  label: 'Reader',
  icon: '📚',
  layout: 'stat',
  cardType: 'reading',
  cacheTtl: 300,
  sublabel: 'saved for later',
  href: () => 'https://read.readwise.io/later',
  required: ['token'],
  configFields: [
    { key: 'token', label: 'API Token', type: 'password' }
  ],
  async fetch({ token }) {
    const data = await fetchJson(
      'https://readwise.io/api/v3/list/?location=later&page_size=1', // page_size=1 — response `count` gives the total regardless of page size
      tokenAuth(token)
    );
    return data.count ?? 0;
  }
};
