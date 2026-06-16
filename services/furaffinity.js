import { AuthError } from '../assets/js/fetch.js';

// FA has no official API. One fetch to /msg/others/ contains all notification counts
// as `a.notification-container` elements with a title like "72 Submission Notifications".
// Uses the browser's active FA session — no credentials to configure.
export default {
  id: 'furaffinity',
  label: 'FurAffinity',
  icon: '🐾',
  layout: 'split',
  cardType: 'social',
  cacheTtl: 5 * 60,
  defaultSize: { cols: 2 },
  href: ({ username }) => `https://www.furaffinity.net/user/${username}/`,
  required: ['username'],
  configFields: [
    { key: 'username', label: 'FA Username', type: 'text', placeholder: 'your-username',
      hint: 'Must be logged in to FurAffinity in this browser.' },
  ],
  stats: [
    { id: 'furaffinity-submissions', sublabel: 'art',      key: 'submissions', href: () => 'https://www.furaffinity.net/msg/submissions/' },
    { id: 'furaffinity-comments',    sublabel: 'comments', key: 'comments',    href: () => 'https://www.furaffinity.net/msg/others/' },
    { id: 'furaffinity-notes',       sublabel: 'notes',    key: 'notes',       href: () => 'https://www.furaffinity.net/msg/pms/' },
    { id: 'furaffinity-watches',     sublabel: 'watches',  key: 'watches',     href: () => 'https://www.furaffinity.net/msg/others/' },
    { id: 'furaffinity-journals',    sublabel: 'journals', key: 'journals',    href: () => 'https://www.furaffinity.net/msg/others/' },
  ],
  async fetch() {
    const res = await fetch('https://www.furaffinity.net/msg/others/', {
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    // Unauthenticated requests redirect to /login
    if (res.url.includes('/login')) throw new AuthError('https://www.furaffinity.net/msg/others/');

    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    const counts = { submissions: 0, comments: 0, notes: 0, watches: 0, journals: 0 };

    doc.querySelectorAll('a.notification-container').forEach(el => {
      const title = el.getAttribute('title') ?? '';
      const n = parseInt(title.replace(/,/g, ''), 10) || 0;
      if (title.includes('Submission'))        counts.submissions = n;
      else if (title.includes('Comment'))      counts.comments = n;
      else if (title.includes('Unread Notes')) counts.notes = n;
      else if (title.includes('Watch'))        counts.watches = n;
      else if (title.includes('Journal'))      counts.journals = n;
    });

    return counts;
  },
};
