// Météo d'un rucher à une heure donnée, via Open-Meteo (gratuit, sans clé).
// Les heures sont exprimées à l'heure locale du rucher (timezone=auto).

const HOURLY = "temperature_2m,wind_speed_10m,cloud_cover,precipitation,weather_code";

// Au-delà, l'API de prévision ne remonte plus : on passe par les archives.
const ARCHIVE_AFTER_DAYS = 80;

const pad = (n) => String(n).padStart(2, "0");

// Vent en km/h, d'après l'échelle de Beaufort : calme, jusqu'à petite brise, jusqu'à bonne brise, au-delà.
function windLabel(kmh) {
  if (kmh == null) return null;
  if (kmh < 2) return "nul";
  if (kmh < 20) return "faible";
  if (kmh < 39) return "modéré";
  return "fort";
}

// Codes météo WMO : 51 et plus, ce sont bruine, pluie, neige, averses ou orage.
function skyLabel(cloud, precipitation, code) {
  if ((code != null && code >= 51) || (precipitation != null && precipitation >= 0.2)) return "pluie";
  if (cloud == null) return null;
  if (cloud < 25) return "ensoleillé";
  if (cloud < 70) return "nuageux";
  return "couvert";
}

// `local` : valeur d'un champ datetime-local, « AAAA-MM-JJTHH:MM ».
export async function fetchWeather(latitude, longitude, local, signal) {
  const date = local.slice(0, 10);
  const minutes = Number(local.slice(14, 16));
  const hour = Math.min(23, Number(local.slice(11, 13)) + (minutes >= 30 ? 1 : 0));
  const ageDays = (Date.now() - new Date(`${date}T12:00:00`).getTime()) / 86400000;

  const base = ageDays > ARCHIVE_AFTER_DAYS
    ? "https://archive-api.open-meteo.com/v1/archive"
    : "https://api.open-meteo.com/v1/forecast";
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    hourly: HOURLY,
    start_date: date,
    end_date: date,
    timezone: "auto",
    wind_speed_unit: "kmh",
  });

  const res = await fetch(`${base}?${params}`, { signal });
  if (!res.ok) throw new Error("Météo indisponible pour cette date.");
  const data = await res.json();
  const index = data.hourly?.time?.indexOf(`${date}T${pad(hour)}:00`) ?? -1;
  if (index < 0) throw new Error("Météo indisponible pour cette heure.");

  const at = (key) => data.hourly[key]?.[index] ?? null;
  const temperature = at("temperature_2m");
  const windKmh = at("wind_speed_10m");
  const cloud = at("cloud_cover");

  return {
    hour,
    temperature_c: temperature == null ? null : Math.round(temperature * 10) / 10,
    wind_kmh: windKmh == null ? null : Math.round(windKmh),
    cloud_cover: cloud,
    wind: windLabel(windKmh),
    sky: skyLabel(cloud, at("precipitation"), at("weather_code")),
  };
}
