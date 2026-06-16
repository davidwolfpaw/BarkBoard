import { readCache, writeCache, isFresh } from "./cache.js";

// ISO 3166-1 alpha-2 codes for European countries supported by Open-Meteo pollen forecasts.
const EU_CODES = new Set([
  "AD",
  "AL",
  "AT",
  "BA",
  "BE",
  "BG",
  "BY",
  "CH",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GB",
  "GR",
  "HR",
  "HU",
  "IE",
  "IS",
  "IT",
  "LI",
  "LT",
  "LU",
  "LV",
  "MD",
  "ME",
  "MK",
  "MT",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "RS",
  "RU",
  "SE",
  "SI",
  "SK",
  "SM",
  "TR",
  "UA",
  "VA",
  "XK",
]);

function aqiCategory(aqi) {
  if (aqi <= 50) return { icon: "🟢", label: "Good" };
  if (aqi <= 100) return { icon: "🟡", label: "Moderate" };
  if (aqi <= 150) return { icon: "🟠", label: "Unhealthy for some" };
  if (aqi <= 200) return { icon: "🔴", label: "Unhealthy" };
  if (aqi <= 300) return { icon: "🟣", label: "Very unhealthy" };
  return { icon: "🟤", label: "Hazardous" };
}

// Converts raw grain counts (grains/m³) to a 0–3 level using type-specific thresholds,
// then picks the worst level across all three pollen types.
function pollenLabel(grass, birch, ragweed) {
  const level = Math.max(
    grass == null ? 0 : grass < 10 ? 0 : grass < 50 ? 1 : grass < 200 ? 2 : 3,
    birch == null ? 0 : birch < 15 ? 0 : birch < 90 ? 1 : birch < 1500 ? 2 : 3,
    ragweed == null
      ? 0
      : ragweed < 10
        ? 0
        : ragweed < 50
          ? 1
          : ragweed < 200
            ? 2
            : 3,
  );
  return ["Low", "Moderate", "High", "Very high"][level] + " pollen";
}

// Returns { icon, aqi, label, pollen } for the given location, cached for 1 hour.
// pollen is a string for European locations, null elsewhere.
export async function getAirQuality(location) {
  if (!location) return null;

  const cached = readCache("airquality");
  if (isFresh(cached, 3600) && cached.value._location === location)
    return cached.value;

  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&format=json`,
  );
  if (!geoRes.ok) throw new Error("Geocoding failed");
  const geoData = await geoRes.json();
  if (!geoData.results?.length)
    throw new Error(`Location not found: ${location}`);

  const { latitude, longitude, country_code } = geoData.results[0];
  const isEurope = EU_CODES.has(country_code?.toUpperCase());

  const currentVars = isEurope
    ? "us_aqi,grass_pollen,birch_pollen,ragweed_pollen"
    : "us_aqi";

  const params = new URLSearchParams({
    latitude,
    longitude,
    current: currentVars,
    timezone: "auto",
  });
  const aqRes = await fetch(
    `https://air-quality-api.open-meteo.com/v1/air-quality?${params}`,
  );
  if (!aqRes.ok) throw new Error("Air quality fetch failed");
  const data = await aqRes.json();

  const { us_aqi, grass_pollen, birch_pollen, ragweed_pollen } = data.current;
  const { icon, label } = aqiCategory(us_aqi);

  const result = {
    icon,
    aqi: us_aqi,
    label,
    pollen: isEurope
      ? pollenLabel(grass_pollen, birch_pollen, ragweed_pollen)
      : null,
    _location: location,
  };

  writeCache("airquality", result);
  return result;
}
