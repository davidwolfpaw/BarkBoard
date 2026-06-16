import { fetchJson } from '../assets/js/fetch.js';

export default {
  id: 'github',
  label: 'GitHub',
  icon: '🐙',
  layout: 'stat',
  cardType: 'tasks',
  cacheTtl: 60,
  sublabel: 'notifications',
  href: () => 'https://github.com/notifications',
  required: ['token'],
  configFields: [
    { key: 'token', label: 'Personal Access Token', type: 'password', placeholder: 'ghp_...' },
    { type: 'separator', label: 'Show notifications for' },
    { key: 'show_pull_requests', label: 'Pull requests', type: 'checkbox', default: true },
    { key: 'show_issues', label: 'Issues', type: 'checkbox', default: true },
    { key: 'show_releases', label: 'Releases', type: 'checkbox', default: false },
    { key: 'show_discussions', label: 'Discussions', type: 'checkbox', default: false },
    { key: 'show_security', label: 'Security alerts', type: 'checkbox', default: true },
  ],
  async fetch(settings) {
    const { token } = settings;

    // !==false keeps a toggle on when its key hasn't been saved yet (default-on).
    // ===true requires an explicit true (default-off).
    const show = {
      PullRequest: settings.show_pull_requests !== false,
      Issue: settings.show_issues !== false,
      Release: settings.show_releases === true,
      Discussion: settings.show_discussions === true,
      RepositoryVulnerabilityAlert: settings.show_security !== false,
    };

    const notifications = await fetchJson(
      'https://api.github.com/notifications?per_page=100',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    return Array.isArray(notifications)
      ? notifications.filter(n => show[n.subject.type] ?? false).length
      : 0;
  }
};
