import { readCache, writeCache, isFresh } from "./cache.js";

// WMO weather interpretation codes as defined in the Open-Meteo API docs (weathercode field).
function wmoIcon(code) {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code <= 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 57) return "🌦️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "🌨️";
  if (code <= 82) return "🌧️";
  if (code <= 86) return "🌨️";
  return "⛈️";
}

function wmoLabel(code) {
  if (code === 0) return "Clear";
  if (code === 1) return "Mostly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code <= 48) return "Fog";
  if (code <= 55) return "Drizzle";
  if (code <= 57) return "Freezing drizzle";
  if (code <= 63) return "Rain";
  if (code <= 65) return "Heavy rain";
  if (code <= 67) return "Freezing rain";
  if (code <= 71) return "Light snow";
  if (code <= 75) return "Snow";
  if (code === 77) return "Snow grains";
  if (code <= 82) return "Rain showers";
  if (code <= 86) return "Snow showers";
  if (code === 95) return "Thunderstorm";
  return "Severe thunderstorm";
}

// Returns { icon, temp, unit, label } for the given location, cached for 1 hour.
// Re-fetches when location or unit settings change even if the cache isn't expired.
export async function getWeather(location, unit) {
  if (!location) return null;

  const cached = readCache("weather");
  if (
    isFresh(cached, 3600) &&
    cached.value._location === location &&
    cached.value._unit === unit
  ) {
    return cached.value;
  }

  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&format=json`,
  );
  if (!geoRes.ok) throw new Error("Geocoding failed");
  const geoData = await geoRes.json();
  if (!geoData.results?.length)
    throw new Error(`Location not found: ${location}`);

  const { latitude, longitude } = geoData.results[0];

  const params = new URLSearchParams({
    latitude,
    longitude,
    current: "temperature_2m,weathercode",
    temperature_unit: unit === "fahrenheit" ? "fahrenheit" : "celsius",
    timezone: "auto",
    forecast_days: "1",
  });

  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params}`,
  );
  if (!weatherRes.ok) throw new Error("Weather fetch failed");
  const data = await weatherRes.json();

  const code = data.current.weathercode;
  const result = {
    icon: wmoIcon(code),
    temp: Math.round(data.current.temperature_2m),
    unit: unit === "fahrenheit" ? "°F" : "°C",
    label: wmoLabel(code),
    _location: location,
    _unit: unit,
  };

  writeCache("weather", result);
  return result;
}
