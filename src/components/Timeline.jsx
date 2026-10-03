// Historique d'une ruche sur une seule frise : visites, traitements, nourrissements, récoltes et reines.
// Filtres par type, par action, par période et dans les notes ; deux visites peuvent être comparées.

import { useState } from "react";
import FrameRow from "./FrameRow.jsx";
import VisitCompare from "./VisitCompare.jsx";
import { Chips, Segmented } from "./ui.jsx";
import { ACTIONS, TEMPER_LABELS, formatDateTime, formatDay, formatKg } from "../util.js";

const KINDS = {
  visit: "Visites",
  treatment: "Traitements",
  feeding: "Nourrissements",
  harvest: "Récoltes",
  queen: "Reines",
};

const PERIODS = [
  { value: "all", label: "Tout" },
  { value: "90", label: "3 mois" },
  { value: "year", label: "Cette année" },
];

const atNoon = (value) => new Date(`${value}T12:00:00`);

// Minuscules, sans accents : « eclosion » trouve « Éclosion ».
const fold = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

function yesNo(value) {
  if (value === true) return "Oui";
  if (value === false) return "Non";
  return "–";
}

function buildEvents({ inspections, treatments, feedings, harvests, queens }) {
  const events = [];
  for (const v of inspections) {
    events.push({ key: `v${v.id}`, kind: "visit", date: new Date(v.inspected_at), visit: v, text: [v.notes, ...(v.actions ?? [])] });
  }
  for (const t of treatments) {
    events.push({
      key: `t${t.id}`,
      kind: "treatment",
      day: t.started_on,
      date: atNoon(t.started_on),
      title: `Début du traitement : ${t.product}`,
      detail: [t.reason, t.dose, t.ended_on ? `jusqu'au ${formatDay(t.ended_on)}` : "en cours"].filter(Boolean).join(" · "),
      notes: t.notes,
      text: [t.product, t.reason, t.dose, t.notes],
    });
    if (t.ended_on) {
      events.push({ key: `te${t.id}`, kind: "treatment", day: t.ended_on, date: atNoon(t.ended_on), title: `Fin du traitement : ${t.product}`, text: [t.product] });
    }
  }
  for (const f of feedings) {
    events.push({
      key: `f${f.id}`,
      kind: "feeding",
      day: f.fed_on,
      date: atNoon(f.fed_on),
      title: `Nourrissement : ${f.feed_type}`,
      detail: f.quantity_kg != null ? formatKg(f.quantity_kg) : "",
      text: [f.feed_type],
    });
  }
  for (const h of harvests) {
    events.push({
      key: `h${h.id}`,
      kind: "harvest",
      day: h.harvested_on,
      date: atNoon(h.harvested_on),
      title: `Récolte : ${formatKg(h.quantity_kg)}`,
      detail: h.honey_type ?? "",
      notes: h.notes,
      text: [h.honey_type, h.notes],
    });
  }
  for (const q of queens) {
    if (!q.introduced_on) continue;
    events.push({
      key: `q${q.id}`,
      kind: "queen",
      day: q.introduced_on,
      date: atNoon(q.introduced_on),
      title: "Nouvelle reine",
      detail: [q.birth_year && `née en ${q.birth_year}`, q.marking_color && `marquée ${q.marking_color}`, q.strain]
        .filter(Boolean)
        .join(", "),
      text: [q.strain, q.origin],
    });
  }
  return events.sort((a, b) => b.date - a.date);
}

function VisitCard({ visit: v, selected, onToggleCompare, onDelete }) {
  return (
    <>
      <div className="visit-head">
        <strong>{formatDateTime(v.inspected_at)}</strong>
        <span className="record-tools">
          <button type="button" className="link-btn" aria-pressed={selected} onClick={onToggleCompare}>
            {selected ? "Retirer de la comparaison" : "Comparer"}
          </button>
          <button type="button" className="link-btn link-btn--danger" onClick={onDelete}>Supprimer</button>
        </span>
      </div>
      {v.frame_layout && <FrameRow frames={v.frame_layout} compact />}
      <dl className="visit-facts">
        <div><dt>Reine vue</dt><dd>{yesNo(v.queen_seen)}</dd></div>
        <div><dt>Œufs</dt><dd>{yesNo(v.eggs_seen)}</dd></div>
        {v.queen_cells === true && <div><dt>Cellules royales</dt><dd>Oui</dd></div>}
        {v.brood_frames != null && <div><dt>Couvain</dt><dd>{v.brood_frames}</dd></div>}
        {v.honey_frames != null && <div><dt>Miel</dt><dd>{v.honey_frames}</dd></div>}
        {v.pollen_frames != null && <div><dt>Pollen</dt><dd>{v.pollen_frames}</dd></div>}
        {v.bee_frames != null && <div><dt>Cadres d'abeilles</dt><dd>{v.bee_frames}</dd></div>}
        {v.supers_count != null && <div><dt>Hausses</dt><dd>{v.supers_count}</dd></div>}
        {v.temper != null && <div><dt>Comportement</dt><dd>{TEMPER_LABELS[v.temper]}</dd></div>}
        {v.temperature_c != null && <div><dt>Température</dt><dd>{v.temperature_c} °C</dd></div>}
        {v.wind && <div><dt>Vent</dt><dd>{v.wind}</dd></div>}
        {v.sky && <div><dt>Ciel</dt><dd>{v.sky}</dd></div>}
      </dl>
      {v.actions?.length > 0 && <p className="visit-actions">{v.actions.join(", ")}</p>}
      {v.notes && <p className="notes">{v.notes}</p>}
    </>
  );
}

export default function Timeline({ inspections, treatments, feedings, harvests, queens, onDeleteInspection }) {
  const [kinds, setKinds] = useState([]); // vide : tous les types
  const [period, setPeriod] = useState("all");
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");
  const [compare, setCompare] = useState([]); // identifiants de visites, deux au plus

  const events = buildEvents({ inspections, treatments, feedings, harvests, queens });

  const now = new Date();
  const since =
    period === "90" ? new Date(now.getTime() - 90 * 86400000)
    : period === "year" ? new Date(now.getFullYear(), 0, 1)
    : null;
  const needle = fold(search.trim());
  const kindLabels = kinds.map((k) => KINDS[k]);

  const shown = events.filter((e) => {
    if (kinds.length > 0 && !kinds.includes(e.kind)) return false;
    if (since && e.date < since) return false;
    if (action && !(e.kind === "visit" && e.visit.actions?.includes(action))) return false;
    if (needle && !fold([e.title, ...(e.text ?? [])].join(" ")).includes(needle)) return false;
    return true;
  });
  const filtering = kinds.length > 0 || period !== "all" || action !== "" || needle !== "";

  const toggleCompare = (id) =>
    setCompare((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id].slice(-2)));
  const compared = inspections.filter((v) => compare.includes(v.id));

  const reset = () => {
    setKinds([]);
    setPeriod("all");
    setAction("");
    setSearch("");
  };

  return (
    <section className="section">
      <h2>Historique</h2>

      {events.length > 0 && (
        <details className="filters">
          <summary>Filtrer{filtering ? ` (${shown.length} sur ${events.length})` : ""}</summary>
          <div className="stack">
            <Chips
              options={Object.values(KINDS)}
              value={kindLabels}
              onChange={(labels) =>
                setKinds(Object.keys(KINDS).filter((k) => labels.includes(KINDS[k])))
              }
            />
            <Segmented options={PERIODS} value={period} onChange={setPeriod} />
            <div className="pair">
              <label className="field">
                <span className="field-label">Action</span>
                <select value={action} onChange={(e) => setAction(e.target.value)}>
                  <option value="">Toutes</option>
                  {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </label>
              <label className="field">
                <span className="field-label">Dans les notes</span>
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Chercher…" />
              </label>
            </div>
            {filtering && (
              <button type="button" className="btn btn--ghost btn--small" onClick={reset}>Effacer les filtres</button>
            )}
          </div>
        </details>
      )}

      {compared.length === 2 && <VisitCompare visits={compared} onClose={() => setCompare([])} />}
      {compared.length === 1 && (
        <p className="compare-hint" role="status">Choisis une deuxième visite à comparer.</p>
      )}

      {events.length === 0 && <p className="muted">Rien d'enregistré pour l'instant. La première visite apparaîtra ici.</p>}
      {events.length > 0 && shown.length === 0 && <p className="muted">Aucun élément ne correspond aux filtres.</p>}

      <ul className="history">
        {shown.map((e) =>
          e.kind === "visit" ? (
            <li key={e.key} className={`visit${compare.includes(e.visit.id) ? " is-selected" : ""}`}>
              <VisitCard
                visit={e.visit}
                selected={compare.includes(e.visit.id)}
                onToggleCompare={() => toggleCompare(e.visit.id)}
                onDelete={() => onDeleteInspection(e.visit.id)}
              />
            </li>
          ) : (
            <li key={e.key} className={`event event--${e.kind}`}>
              <span className="event-date">{formatDay(e.day)}</span>
              <strong>{e.title}</strong>
              {e.detail && <span className="record-sub">{e.detail}</span>}
              {e.notes && <p className="notes">{e.notes}</p>}
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
