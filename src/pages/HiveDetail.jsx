import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { hiveAlerts } from "../alerts.js";
import DevelopmentChart, { chartVisits } from "../components/DevelopmentChart.jsx";
import { Feedings, Harvests, Treatments } from "../components/HiveRecords.jsx";
import NextVisit from "../components/NextVisit.jsx";
import Timeline from "../components/Timeline.jsx";
import { AlertList, ErrorNote, Field, Loading, QueenDot } from "../components/ui.jsx";
import {
  MARKINGS, STATUS_LABELS, formatCoords, formatDay, mapUrl, markingForYear, toNumberOrNull,
} from "../util.js";

function QueenForm({ hiveId, onDone, onCancel }) {
  const [q, setQ] = useState({ birth_year: "", strain: "", origin: "", marking_color: "", introduced_on: "" });
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post(`/hives/${hiveId}/queens`, { ...q, birth_year: toNumberOrNull(q.birth_year) });
      onDone();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="stack inline-form">
      <Field label="Année de naissance">
        <input
          inputMode="numeric"
          value={q.birth_year}
          onChange={(e) => {
            const value = e.target.value;
            setQ((s) => ({ ...s, birth_year: value, marking_color: touched ? s.marking_color : markingForYear(value) }));
          }}
        />
      </Field>
      <Field label="Marquage">
        <select
          value={q.marking_color}
          onChange={(e) => {
            setTouched(true);
            setQ((s) => ({ ...s, marking_color: e.target.value }));
          }}
        >
          <option value="">Non marquée</option>
          {MARKINGS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Souche">
        <input value={q.strain} onChange={(e) => setQ((s) => ({ ...s, strain: e.target.value }))} />
      </Field>
      <Field label="Origine">
        <input value={q.origin} onChange={(e) => setQ((s) => ({ ...s, origin: e.target.value }))} />
      </Field>
      <Field label="Date d'introduction" hint="Laisse vide pour aujourd'hui.">
        <input type="date" value={q.introduced_on} onChange={(e) => setQ((s) => ({ ...s, introduced_on: e.target.value }))} />
      </Field>
      <ErrorNote message={error} />
      <button className="btn btn--primary" disabled={busy}>Enregistrer la nouvelle reine</button>
      <button type="button" className="btn btn--ghost" onClick={onCancel}>Annuler</button>
    </form>
  );
}

export default function HiveDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [inspections, setInspections] = useState(null);
  const [error, setError] = useState("");
  const [changingQueen, setChangingQueen] = useState(false);

  const load = useCallback(() => {
    Promise.all([api.get(`/hives/${id}`), api.get(`/hives/${id}/inspections`)])
      .then(([detail, list]) => {
        setData(detail);
        setInspections(list);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(load, [load]);

  const removeInspection = async (inspectionId) => {
    if (!window.confirm("Supprimer cette visite ?")) return;
    try {
      await api.del(`/inspections/${inspectionId}`);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  if (!data || !inspections) return error ? <ErrorNote message={error} /> : <Loading />;

  const { hive, queens } = data;
  const currentQueen = queens.find((q) => !q.replaced_on);
  const pastQueens = queens.filter((q) => q.replaced_on);
  const alerts = hiveAlerts({ ...hive, recent: inspections.slice(0, 2) });

  return (
    <>
      <Link to="/" className="back">Toutes les ruches</Link>
      <header className="page-head">
        <div>
          <h1>{hive.name}</h1>
          <p className="muted">
            {hive.model_name} ({hive.body_frames} cadres)
            {hive.status !== "active" && <span className="tag">{STATUS_LABELS[hive.status]}</span>}
          </p>
        </div>
        <Link to={`/ruches/${hive.id}/modifier`} className="btn btn--ghost btn--small">Modifier</Link>
      </header>

      <ErrorNote message={error} />
      <AlertList alerts={alerts} />

      <div className="detail-cols">
        <div className="detail-main">
          <dl className="facts">
            {hive.apiary_name && (
              <div>
                <dt>Rucher</dt>
                <dd>
                  {hive.apiary_name}
                  {hive.latitude != null && hive.longitude != null && (
                    <>
                      <br />
                      <a href={mapUrl(hive.latitude, hive.longitude)} target="_blank" rel="noreferrer">
                        {formatCoords(hive.latitude, hive.longitude)}
                      </a>
                    </>
                  )}
                </dd>
              </div>
            )}
            {hive.installed_on && (
              <div><dt>Mise en place</dt><dd>{formatDay(hive.installed_on)}</dd></div>
            )}
            {hive.origin && <div><dt>Origine</dt><dd>{hive.origin}</dd></div>}
          </dl>
          {hive.notes && <p className="notes">{hive.notes}</p>}

          {hive.status === "active" && <NextVisit key={hive.next_visit_on ?? ""} hive={hive} onSaved={load} />}

          {hive.status === "active" && (
            <Link to={`/ruches/${hive.id}/visite`} className="btn btn--primary btn--wide">Nouvelle visite</Link>
          )}

          <section className="section">
            <h2>Reine</h2>
            {currentQueen ? (
              <p className="queen-line">
                <QueenDot color={currentQueen.marking_color} size={22} />
                <span>
                  {currentQueen.birth_year ? `Née en ${currentQueen.birth_year}` : "Année inconnue"}
                  {currentQueen.marking_color ? `, marquée ${currentQueen.marking_color}` : ""}
                  {currentQueen.strain ? `, souche ${currentQueen.strain}` : ""}
                  {currentQueen.introduced_on ? `, en place depuis le ${formatDay(currentQueen.introduced_on)}` : ""}
                </span>
              </p>
            ) : (
              <p className="muted">Aucune reine enregistrée.</p>
            )}
            {changingQueen ? (
              <QueenForm
                hiveId={hive.id}
                onCancel={() => setChangingQueen(false)}
                onDone={() => {
                  setChangingQueen(false);
                  load();
                }}
              />
            ) : (
              <button className="btn btn--ghost btn--small" onClick={() => setChangingQueen(true)}>
                {currentQueen ? "Changer de reine" : "Ajouter une reine"}
              </button>
            )}
            {pastQueens.length > 0 && (
              <details className="past">
                <summary>Reines précédentes ({pastQueens.length})</summary>
                <ul className="plain">
                  {pastQueens.map((q) => (
                    <li key={q.id}>
                      {q.birth_year ? `Née en ${q.birth_year}` : "Année inconnue"}
                      {q.marking_color ? `, ${q.marking_color}` : ""}
                      {q.replaced_on ? `, remplacée le ${formatDay(q.replaced_on)}` : ""}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>

          <Treatments hiveId={hive.id} items={data.treatments} onChange={load} onError={setError} />
          <Feedings hiveId={hive.id} items={data.feedings} onChange={load} onError={setError} />
          <Harvests hiveId={hive.id} items={data.harvests} onChange={load} onError={setError} />
        </div>

        <div className="detail-side">
          {chartVisits(inspections).length >= 2 && (
            <section className="section">
              <h2>Développement</h2>
              <DevelopmentChart inspections={inspections} bodyFrames={hive.body_frames} />
            </section>
          )}
          <Timeline
            inspections={inspections}
            treatments={data.treatments}
            feedings={data.feedings}
            harvests={data.harvests}
            queens={queens}
            onDeleteInspection={removeInspection}
          />
        </div>
      </div>
    </>
  );
}
