import { fetchJson } from '../assets/js/fetch.js';
import { getGoogleToken } from '../assets/js/google-auth.js';

export default {
  id: 'gmail',
  label: 'Gmail',
  icon: '📧',
  layout: 'stat',
  cardType: 'mail',
  cacheTtl: 60,
  sublabel: 'unread',
  href: () => 'https://mail.google.com/',
  required: ['client_id', 'client_secret', 'refresh_token'],
  configFields: [
    { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'xxxx.apps.googleusercontent.com' },
    { key: 'client_secret', label: 'Client Secret', type: 'password' },
    { key: 'refresh_token', label: 'Refresh Token', type: 'password' }
  ],
  async fetch({ client_id, client_secret, refresh_token }) {
    const token = await getGoogleToken(client_id, client_secret, refresh_token);
    const { messagesUnread } = await fetchJson(
      'https://gmail.googleapis.com/gmail/v1/users/me/labels/INBOX',
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    return messagesUnread ?? 0;
  }
};
