import { fetchJson } from '../assets/js/fetch.js';

// Ship24 is a package tracking aggregator supporting 1500+ carriers.
// The free tier allows 100 API calls/month — comfortable for manual-refresh personal use
// since each refresh costs 1 credit per package.
function formatMilestone(m) {
  return m.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatEta(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.round((date - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'Past due';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default {
  id: 'tracking',
  label: 'Packages',
  icon: '📦',
  layout: 'tracking',
  cardType: 'tracking',
  // 24-hour default cache — status is refreshed manually via the card's refresh button.
  cacheTtl: 24 * 60 * 60,
  sublabel: 'packages',
  href: () => 'https://ship24.com',
  required: ['apiKey'],
  // Signals that the options UI should render an add/remove package list for this service.
  hasPackages: true,
  configFields: [
    { key: 'apiKey', label: 'Ship24 API Key', type: 'password', placeholder: 'sk_live_...' },
  ],
  async fetch(settings) {
    const { apiKey, packages = [] } = settings;
    if (!packages.length) return [];

    // Fetch all packages in parallel to minimise wall-clock time.
    // allSettled so a single failed lookup doesn't discard the rest.
    const results = await Promise.allSettled(
      packages.map(pkg =>
        fetchJson('https://api.ship24.com/public/v1/trackers/track', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ trackingNumber: pkg.trackingNumber }),
        })
      )
    );

    return results.map((result, i) => {
      const pkg = packages[i];
      const displayLabel = pkg.label || pkg.trackingNumber;

      const trackingUrl = `https://ship24.com/tracking?p=${encodeURIComponent(pkg.trackingNumber)}`;

      if (result.status === 'rejected') {
        return { label: displayLabel, trackingNumber: pkg.trackingNumber, milestone: 'Error', location: null, url: trackingUrl, eta: null, delivered: false };
      }

      const tracking = result.value?.data?.trackings?.[0];
      if (!tracking) {
        return { label: displayLabel, trackingNumber: pkg.trackingNumber, milestone: 'Unknown', location: null, url: trackingUrl, eta: null, delivered: false };
      }

      const shipment = tracking.shipment;
      // events are newest-first; index 0 is the most recent status update.
      const latestEvent = shipment?.events?.[0];
      const etaRaw = shipment?.delivery?.estimatedDeliveryDate;
      const delivered = shipment?.statusMilestone === 'delivered';
      const milestone = shipment?.statusMilestone
        ? formatMilestone(shipment.statusMilestone)
        : (shipment?.statusCategory ?? latestEvent?.status ?? 'Unknown');

      return {
        label: displayLabel,
        trackingNumber: pkg.trackingNumber,
        milestone,
        location: latestEvent?.location ?? null,
        url: trackingUrl,
        eta: etaRaw && !delivered ? formatEta(etaRaw) : null,
        delivered,
      };
    });
  },
};
