import { fetchJson } from "../assets/js/fetch.js";
import { getGoogleToken } from "../assets/js/google-auth.js";

export default {
  id: "gcalendar",
  label: "Google Calendar",
  icon: "📅",
  layout: "agenda",
  cardType: "calendar",
  cacheTtl: 300,
  href: () => "https://calendar.google.com/",
  required: ["client_id", "client_secret", "refresh_token"],
  configFields: [
    {
      key: "client_id",
      label: "Client ID",
      type: "text",
      placeholder: "xxxx.apps.googleusercontent.com",
    },
    { key: "client_secret", label: "Client Secret", type: "password" },
    { key: "refresh_token", label: "Refresh Token", type: "password" },
    { type: "separator", label: "Options" },
    {
      key: "show_all_day",
      label: "Include all-day events",
      type: "checkbox",
      default: true,
    },
  ],
  async fetch({ client_id, client_secret, refresh_token, show_all_day }) {
    const token = await getGoogleToken(client_id, client_secret, refresh_token);

    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const params = new URLSearchParams({
      timeMin: now.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: "true", // expand recurring events into individual instances
      orderBy: "startTime",
      maxResults: "50",
    });

    const { items = [] } = await fetchJson(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    // Strict false check — undefined means the setting was never saved, which should default to showing all-day events.
    const filtered =
      show_all_day === false ? items.filter((e) => e.start.dateTime) : items;

    return filtered.map((e) => ({
      title: e.summary ?? "(no title)",
      time: e.start.dateTime
        ? new Date(e.start.dateTime).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })
        : "All day",
    }));
  },
};
