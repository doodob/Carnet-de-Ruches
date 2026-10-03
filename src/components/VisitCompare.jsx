// Deux visites côte à côte : les rangées de cadres, les cadres qui ont changé, et l'écart des chiffres.

import FrameRow, { FRAME_LABELS } from "./FrameRow.jsx";
import { TEMPER_LABELS, formatDateTime } from "../util.js";

const ROWS = [
  { key: "brood_frames", label: "Couvain" },
  { key: "honey_frames", label: "Miel" },
  { key: "pollen_frames", label: "Pollen" },
  { key: "bee_frames", label: "Cadres d'abeilles" },
  { key: "supers_count", label: "Hausses" },
];

function delta(a, b) {
  if (a == null || b == null) return "";
  const d = b - a;
  if (d === 0) return "=";
  return d > 0 ? `+${d}` : `−${-d}`;
}

export default function VisitCompare({ visits, onClose }) {
  const [older, newer] = [...visits].sort((a, b) => new Date(a.inspected_at) - new Date(b.inspected_at));
  const days = Math.round((new Date(newer.inspected_at) - new Date(older.inspected_at)) / 86400000);

  const a = older.frame_layout ?? [];
  const b = newer.frame_layout ?? [];
  const changed = b.map((state, i) => (a[i] !== undefined && a[i] !== state ? i : -1)).filter((i) => i >= 0);
  const moves = changed.map((i) => `cadre ${i + 1} : ${FRAME_LABELS[a[i]].toLowerCase()} → ${FRAME_LABELS[b[i]].toLowerCase()}`);

  return (
    <section className="compare" aria-label="Comparaison de deux visites">
      <div className="compare-head">
        <h3>Comparaison, {days} jour{days > 1 ? "s" : ""} d'écart</h3>
        <button type="button" className="link-btn" onClick={onClose}>Fermer</button>
      </div>

      {a.length > 0 && b.length > 0 ? (
        <>
          <p className="compare-label">{formatDateTime(older.inspected_at)}</p>
          <FrameRow frames={a} compact />
          <p className="compare-label">{formatDateTime(newer.inspected_at)}</p>
          <FrameRow frames={b} compact changed={changed} />
          <p className="muted">
            {changed.length === 0
              ? "Aucun cadre n'a changé."
              : `${changed.length} cadre${changed.length > 1 ? "s ont" : " a"} changé (entourés) : ${moves.join(", ")}.`}
          </p>
        </>
      ) : (
        <p className="muted">Une des deux visites n'a pas de plan des cadres.</p>
      )}

      <table className="compare-table">
        <thead>
          <tr>
            <th scope="col"></th>
            <th scope="col">Avant</th>
            <th scope="col">Après</th>
            <th scope="col">Écart</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.key}>
              <th scope="row">{r.label}</th>
              <td>{older[r.key] ?? "–"}</td>
              <td>{newer[r.key] ?? "–"}</td>
              <td>{delta(older[r.key], newer[r.key])}</td>
            </tr>
          ))}
          <tr>
            <th scope="row">Comportement</th>
            <td>{older.temper ? TEMPER_LABELS[older.temper] : "–"}</td>
            <td>{newer.temper ? TEMPER_LABELS[newer.temper] : "–"}</td>
            <td>{delta(older.temper, newer.temper)}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
