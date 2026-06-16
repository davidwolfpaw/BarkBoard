import { fetchJson } from '../assets/js/fetch.js';

// Tumblr's notifications endpoint requires OAuth 1.0a — it doesn't accept plain API keys.
// The Web Crypto API handles HMAC-SHA1 signing so no external library is needed.
async function buildOauthHeader(method, url, consumerKey, consumerSecret, oauthToken, oauthTokenSecret) {
  const params = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomUUID().replace(/-/g, ''),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: oauthToken,
    oauth_version: '1.0',
  };

  // Signature base string: METHOD & percent(url) & percent(sorted_params)
  const paramString = Object.keys(params)
    .sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');

  const baseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(paramString),
  ].join('&');

  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(oauthTokenSecret)}`;

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(signingKey),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );

  const sigBytes = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(baseString));
  params.oauth_signature = btoa(String.fromCharCode(...new Uint8Array(sigBytes)));

  return 'OAuth ' + Object.keys(params)
    .sort()
    .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(params[k])}"`)
    .join(', ');
}

export default {
  id: 'tumblr',
  label: 'Tumblr',
  icon: '🫧',
  layout: 'stat',
  cardType: 'social',
  cacheTtl: 5 * 60,
  sublabel: 'notifications',
  href: (settings) => `https://www.tumblr.com/blog/${encodeURIComponent(settings.blog ?? '')}/activity`,
  required: ['blog', 'consumer_key', 'consumer_secret', 'oauth_token', 'oauth_token_secret'],
  configFields: [
    {
      key: 'blog',
      label: 'Blog name',
      type: 'text',
      placeholder: 'yourblog',
      hint: 'The part before .tumblr.com — e.g. "yourblog" from yourblog.tumblr.com.',
    },
    { type: 'separator', label: 'OAuth credentials' },
    {
      key: 'consumer_key',
      label: 'Consumer Key',
      type: 'password',
      placeholder: '',
      hint: 'Create an app at tumblr.com/oauth/apps, then authorize at api.tumblr.com/console to get all four tokens.',
    },
    { key: 'consumer_secret', label: 'Consumer Secret', type: 'password', placeholder: '' },
    { key: 'oauth_token', label: 'OAuth Token', type: 'password', placeholder: '' },
    { key: 'oauth_token_secret', label: 'OAuth Token Secret', type: 'password', placeholder: '' },
  ],
  async fetch(settings) {
    const { blog, consumer_key, consumer_secret, oauth_token, oauth_token_secret } = settings;
    const url = `https://api.tumblr.com/v2/blog/${encodeURIComponent(blog)}/notifications`;

    const auth = await buildOauthHeader('GET', url, consumer_key, consumer_secret, oauth_token, oauth_token_secret);
    const data = await fetchJson(url, { headers: { Authorization: auth } });

    return Array.isArray(data?.response?.notifications)
      ? data.response.notifications.length
      : 0;
  },
};
