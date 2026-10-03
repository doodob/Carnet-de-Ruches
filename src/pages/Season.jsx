import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { ErrorNote, Loading } from "../components/ui.jsx";
import { STATUS_LABELS, formatDay, formatKg } from "../util.js";

const number = (value) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value);

function treatmentLine(t) {
  const dates = t.ended_on ? `du ${formatDay(t.started_on)} au ${formatDay(t.ended_on)}` : `depuis le ${formatDay(t.started_on)}`;
  return [t.product, t.dose, dates].filter(Boolean).join(", ");
}

// CSV pour un tableur réglé en français : séparateur « ; », virgule décimale, BOM pour les accents.
function toCsv(rows) {
  const cell = (value) => {
    const s = String(value ?? "");
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + rows.map((row) => row.map(cell).join(";")).join("\r\n");
}

function download(filename, content) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function Season() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setData(null);
    setError("");
    api.get(`/season/${year}`).then(setData).catch((e) => setError(e.message));
  }, [year]);

  const years = [...new Set([new Date().getFullYear(), year, ...(data?.years ?? [])])].sort((a, b) => b - a);

  const hives = (data?.hives ?? []).filter(
    (h) => h.status === "active" || h.visits > 0 || h.harvest_kg > 0 || h.feedings > 0 || h.treatments.length > 0,
  );
  const totals = {
    harvest: hives.reduce((sum, h) => sum + h.harvest_kg, 0),
    feed: hives.reduce((sum, h) => sum + h.feed_kg, 0),
    visits: hives.reduce((sum, h) => sum + h.visits, 0),
    treatments: hives.reduce((sum, h) => sum + h.treatments.length, 0),
  };
  const harvested = hives.filter((h) => h.harvest_kg > 0);
  const register = hives
    .flatMap((h) => h.treatments.map((t) => ({ ...t, hive: h.name })))
    .sort((a, b) => a.started_on.localeCompare(b.started_on));

  const exportCsv = () => {
    const rows = [
      ["Ruche", "Rucher", "Statut", "Visites", "Miel (kg)", "Nourrissement (kg)", "Traitements"],
      ...hives.map((h) => [
        h.name,
        h.apiary_name ?? "",
        STATUS_LABELS[h.status],
        h.visits,
        number(h.harvest_kg),
        number(h.feed_kg),
        h.treatments.map(treatmentLine).join(" | "),
      ]),
      ["Total", "", "", totals.visits, number(totals.harvest), number(totals.feed), totals.treatments],
    ];
    download(`bilan-rucher-${year}.csv`, toCsv(rows));
  };

  return (
    <>
      <header className="page-head">
        <h1>Bilan {year}</h1>
        <label className="field year-pick no-print">
          <span className="sr-only">Année</span>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
      </header>

      <ErrorNote message={error} />
      {!data && !error && <Loading />}

      {data && (
        <>
          <dl className="tiles">
            <div className="tile">
              <dt>Miel récolté</dt>
              <dd>{formatKg(totals.harvest)}</dd>
              {harvested.length > 0 && (
                <span className="tile-sub">
                  sur {harvested.length} ruche{harvested.length > 1 ? "s" : ""}, {formatKg(totals.harvest / harvested.length)} en moyenne
                </span>
              )}
            </div>
            <div className="tile">
              <dt>Visites</dt>
              <dd>{totals.visits}</dd>
            </div>
            <div className="tile">
              <dt>Nourrissement</dt>
              <dd>{formatKg(totals.feed)}</dd>
            </div>
            <div className="tile">
              <dt>Traitements</dt>
              <dd>{totals.treatments}</dd>
            </div>
          </dl>

          <div className="row-buttons no-print">
            <button type="button" className="btn btn--ghost btn--small" onClick={exportCsv} disabled={hives.length === 0}>
              Exporter en CSV
            </button>
            <button type="button" className="btn btn--ghost btn--small" onClick={() => window.print()}>
              Imprimer ou enregistrer en PDF
            </button>
          </div>

          <section className="section">
            <h2>Par ruche</h2>
            {hives.length === 0 ? (
              <p className="muted">Rien d'enregistré en {year}.</p>
            ) : (
              <div className="table-scroll">
                <table className="season">
                  <thead>
                    <tr>
                      <th scope="col">Ruche</th>
                      <th scope="col" className="num">Visites</th>
                      <th scope="col" className="num">Miel</th>
                      <th scope="col" className="num">Nourrissement</th>
                      <th scope="col">Traitements</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hives.map((h) => (
                      <tr key={h.id}>
                        <th scope="row">
                          <Link to={`/ruches/${h.id}`}>{h.name}</Link>
                          {h.status !== "active" && <span className="tag">{STATUS_LABELS[h.status]}</span>}
                          {h.apiary_name && <span className="board-sub">{h.apiary_name}</span>}
                        </th>
                        <td className="num">{h.visits}</td>
                        <td className="num">{h.harvest_kg > 0 ? formatKg(h.harvest_kg) : "–"}</td>
                        <td className="num">{h.feed_kg > 0 ? formatKg(h.feed_kg) : "–"}</td>
                        <td>{h.treatments.map((t) => t.product).join(", ") || "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th scope="row">Total</th>
                      <td className="num">{totals.visits}</td>
                      <td className="num">{formatKg(totals.harvest)}</td>
                      <td className="num">{formatKg(totals.feed)}</td>
                      <td>{totals.treatments}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>

          <section className="section">
            <h2>Registre des traitements</h2>
            {register.length === 0 ? (
              <p className="muted">Aucun traitement en {year}.</p>
            ) : (
              <ul className="records">
                {register.map((t, i) => (
                  <li key={i} className="record">
                    <strong>{t.hive}</strong> : {treatmentLine(t)}
                    {t.reason && <span className="record-sub">Motif : {t.reason}</span>}
                    {t.notes && <span className="record-sub">{t.notes}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
