const fmt = (d) => `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;

export default {
  id: 'science',
  label: 'Science',
  icon: '🔭',
  layout: 'agenda',
  cardType: 'admin',
  cacheTtl: 15 * 60,
  defaultSize: { rows: 2 },
  href: ({ state }) =>
    state
      ? `https://forecast.weather.gov/MapClick.php?CityName=&state=${state.toUpperCase()}`
      : 'https://www.weather.gov',
  required: [],
  configFields: [
    {
      key: 'state',
      label: 'US State',
      type: 'text',
      placeholder: 'WI',
      hint: '2-letter code for NWS weather alerts and drought monitor.',
    },
    { key: 'lat', label: 'Latitude', type: 'text', placeholder: '43.07' },
    {
      key: 'lon',
      label: 'Longitude',
      type: 'text',
      placeholder: '-89.40',
      hint: 'Used for air quality readings.',
    },
  ],
  async fetch({ state, lat, lon }) {
    const rows = [];

    const promises = [
      // Aurora — NOAA SWPC geomagnetic scale (no location needed)
      fetch('https://services.swpc.noaa.gov/json/noaa-scales.json')
        .then((r) => r.json())
        .then((data) => {
          const g = data['0']?.G ?? {};
          const scale = g.Scale ?? 'G0';
          const text = scale === 'G0' ? 'Quiet' : (g.Text ?? scale);
          rows.push({ time: 'Aurora', title: `${scale} · ${text}`, _order: 0 });
        })
        .catch(() => rows.push({ time: 'Aurora', title: '—', _order: 0 })),

      // Earthquakes — USGS significant events today (no location needed)
      fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson')
        .then((r) => r.json())
        .then((data) => {
          const features = data.features ?? [];
          if (!features.length) {
            rows.push({ time: 'Quakes', title: 'None today', _order: 1 });
            return;
          }
          const strongest = features.reduce((m, f) =>
            f.properties.mag > m.properties.mag ? f : m
          );
          const place = strongest.properties.place ?? '';
          const prefix = features.length > 1 ? `${features.length} · ` : '';
          rows.push({
            time: 'Quakes',
            title: `${prefix}M${strongest.properties.mag?.toFixed(1)} ${place}`.trim(),
            _order: 1,
          });
        })
        .catch(() => rows.push({ time: 'Quakes', title: '—', _order: 1 })),
    ];

    if (state) {
      const s = encodeURIComponent(state.toUpperCase());

      // NWS Weather Alerts
      promises.push(
        fetch(`https://api.weather.gov/alerts/active?area=${s}`)
          .then((r) => r.json())
          .then((data) => {
            const active = (data.features ?? []).filter(
              (f) => f.properties.status === 'Actual'
            );
            const title =
              active.length === 0
                ? 'No alerts'
                : active.length === 1
                  ? active[0].properties.event
                  : `${active.length} · ${active[0].properties.event}`;
            rows.push({ time: 'Weather', title, _order: 2 });
          })
          .catch(() => rows.push({ time: 'Weather', title: '—', _order: 2 }))
      );

      // Drought — USDM DSCI for state
      const end = new Date();
      const start = new Date(end - 7 * 24 * 60 * 60 * 1000);
      const dsciUrl =
        `https://usdmdataservices.unl.edu/api/StateStatistics/GetDSCI` +
        `?aoi=${s}&startdate=${encodeURIComponent(fmt(start))}` +
        `&enddate=${encodeURIComponent(fmt(end))}&statisticsType=1`;
      promises.push(
        fetch(dsciUrl, { headers: { Accept: 'application/json' } })
          .then((r) => r.json())
          .then((data) => {
            const entry = Array.isArray(data) && data.length ? data[data.length - 1] : null;
            const dsci = entry?.DSCI ?? entry?.dsci;
            rows.push({
              time: 'Drought',
              title: dsci != null ? `DSCI ${dsci}` : 'No data',
              _order: 3,
            });
          })
          .catch(() => rows.push({ time: 'Drought', title: '—', _order: 3 }))
      );
    }

    if (lat && lon) {
      // Air Quality — Open-Meteo
      const aqiUrl =
        `https://air-quality-api.open-meteo.com/v1/air-quality` +
        `?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&current=us_aqi`;
      promises.push(
        fetch(aqiUrl)
          .then((r) => r.json())
          .then((data) => {
            const aqi = data.current?.us_aqi;
            const label =
              aqi == null ? '—'
              : aqi <= 50 ? 'Good'
              : aqi <= 100 ? 'Moderate'
              : aqi <= 150 ? 'Unhealthy for Sensitive'
              : aqi <= 200 ? 'Unhealthy'
              : 'Very Unhealthy';
            rows.push({
              time: 'AQI',
              title: aqi != null ? `${aqi} · ${label}` : '—',
              _order: 4,
            });
          })
          .catch(() => rows.push({ time: 'AQI', title: '—', _order: 4 }))
      );
    }

    await Promise.allSettled(promises);
    rows.sort((a, b) => a._order - b._order);
    return rows.map(({ time, title }) => ({ time, title }));
  },
};
