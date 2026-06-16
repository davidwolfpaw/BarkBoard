import { fetchJson, bearer } from '../assets/js/fetch.js';

export default {
  id: 'patreon',
  label: 'Patreon',
  icon: '🎨',
  layout: 'stat',
  cardType: 'creator',
  cacheTtl: 3600,
  sublabel: 'patrons',
  href: () => 'https://www.patreon.com/',
  required: ['access_token'],
  configFields: [
    { key: 'access_token', label: 'Creator Access Token', type: 'password' }
  ],
  async fetch({ access_token }) {
    const data = await fetchJson(
      'https://www.patreon.com/api/oauth2/v2/identity?include=campaign&fields[campaign]=patron_count',
      bearer(access_token)
    );
    // Patreon uses JSON:API — related resources are in the top-level `included` array, not nested in `data`.
    const campaign = data.included?.find(i => i.type === 'campaign');
    return campaign?.attributes?.patron_count ?? 0;
  }
};
