import { fetchJson, bearer, jsonPost } from '../assets/js/fetch.js';

export default {
  id: 'fastmail',
  label: 'Fastmail',
  icon: '📬',
  layout: 'stat',
  cardType: 'mail',
  cacheTtl: 60,
  sublabel: 'unread',
  href: () => 'https://app.fastmail.com/mail/inbox/',
  faviconDomain: 'fastmail.com',
  required: ['token'],
  configFields: [
    { key: 'token', label: 'API Token', type: 'password', placeholder: 'fmu1-...' }
  ],
  async fetch({ token }) {
    // JMAP requires three round-trips: session discovery → mailbox query → email count.
    const jmapUsing = ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail']; // capability URIs
    const session = await fetchJson('https://api.fastmail.com/jmap/session', bearer(token));
    const accountId = Object.keys(session.accounts)[0];

    const mailboxData = await fetchJson(session.apiUrl, jsonPost(token, {
      using: jmapUsing,
      methodCalls: [['Mailbox/query', { accountId, filter: { role: 'inbox' } }, 'm0']]
    }));
    const inboxId = mailboxData.methodResponses[0][1].ids[0];

    const emailData = await fetchJson(session.apiUrl, jsonPost(token, {
      using: jmapUsing,
      methodCalls: [['Email/query', {
        accountId,
        filter: { inMailbox: inboxId, notKeyword: '$seen' },
        calculateTotal: true,
        limit: 0  // fetch no messages, just the total count
      }, 'm0']]
    }));
    return emailData.methodResponses[0][1].total;
  }
};
