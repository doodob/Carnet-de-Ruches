// Marquage international des reines : la couleur dépend du dernier chiffre de l'année.
const MARKING_BY_DIGIT = {
  0: "bleu", 1: "blanc", 2: "jaune", 3: "rouge", 4: "vert",
  5: "bleu", 6: "blanc", 7: "jaune", 8: "rouge", 9: "vert",
};

export const MARKINGS = ["blanc", "jaune", "rouge", "vert", "bleu"];

export const MARKING_HEX = {
  blanc: "#F4F4F0",
  jaune: "#F2D21C",
  rouge: "#D23B2E",
  vert: "#3E9B4F",
  bleu: "#2F63C9",
};

export function markingForYear(year) {
  const n = Number(year);
  if (year === "" || year == null || !Number.isInteger(n)) return "";
  return MARKING_BY_DIGIT[Math.abs(n) % 10] ?? "";
}

export const STATUS_LABELS = {
  active: "Active",
  dead: "Morte",
  merged: "Fusionnée",
  sold: "Vendue",
};

export const ORIGINS = ["Essaim capturé", "Nucléus", "Division", "Achat", "Autre"];

export const WIND = [
  { value: "nul", label: "Nul" },
  { value: "faible", label: "Faible" },
  { value: "modéré", label: "Modéré" },
  { value: "fort", label: "Fort" },
];

export const SKY = [
  { value: "ensoleillé", label: "Soleil" },
  { value: "nuageux", label: "Nuageux" },
  { value: "couvert", label: "Couvert" },
  { value: "pluie", label: "Pluie" },
];

export const ACTIONS = [
  "Nourrissement",
  "Traitement",
  "Pose de hausse",
  "Retrait de hausse",
  "Remplacement de cadres",
  "Cellules royales retirées",
  "Division",
  "Changement de reine",
  "Récolte",
];

// Propositions rapides ; la saisie reste libre.
export const TREATMENT_PRODUCTS = ["Apivar", "Apiguard", "Thymovar", "Api-Bioxal", "Oxybee", "MAQS", "VarroMed"];

export const TREATMENT_REASONS = ["Varroa", "Nosémose", "Loque", "Autre"];

export const FEED_TYPES = ["Sirop 50/50", "Sirop lourd", "Candi", "Pâte protéinée"];

export const HONEY_TYPES = ["Toutes fleurs", "Printemps", "Été", "Acacia", "Châtaignier", "Lavande", "Tilleul", "Miellat"];

export const TEMPER_LABELS = ["", "Très calme", "Calme", "Normale", "Nerveuse", "Agressive"];

export function toNumberOrNull(value) {
  if (value === "" || value == null) return null;
  const n = Number(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

const pad = (n) => String(n).padStart(2, "0");

export function toLocalInputValue(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function todayValue(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const DAY_MS = 86400000;

// Écart en jours entre aujourd'hui et une date AAAA-MM-JJ (positif dans le futur).
export function daysFromToday(value, now = new Date()) {
  return Math.round((new Date(`${value}T12:00:00`) - new Date(`${todayValue(now)}T12:00:00`)) / DAY_MS);
}

export function addDays(value, days) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return todayValue(date);
}

export function relativeDay(value) {
  const days = daysFromToday(value);
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "demain";
  return days > 0 ? `dans ${days} j` : `en retard de ${-days} j`;
}

export const formatKg = (value) =>
  `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value)} kg`;

export function formatDateTime(iso) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// Les dates simples (AAAA-MM-JJ) sont lues à midi pour éviter tout décalage de fuseau.
export function formatDay(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(`${value}T12:00:00`),
  );
}

export function daysAgo(iso) {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  return `il y a ${days} j`;
}

export const mapUrl = (lat, lon) =>
  `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;

export const formatCoords = (lat, lon) => `${Number(lat).toFixed(6)}, ${Number(lon).toFixed(6)}`;
