// Traitements, nourrissements et récoltes d'une ruche : une liste et un formulaire court chacun.

import { useState } from "react";
import { api } from "../api.js";
import { ErrorNote, Field, Picks } from "./ui.jsx";
import {
  FEED_TYPES, HONEY_TYPES, TREATMENT_PRODUCTS, TREATMENT_REASONS, formatDay, formatKg, toNumberOrNull, todayValue,
} from "../util.js";

// Champ libre suivi de propositions à un appui.
function PickField({ label, hint, value, onChange, options, required = false }) {
  return (
    <div className="picked">
      <Field label={label} hint={hint}>
        <input value={value} onChange={(e) => onChange(e.target.value)} required={required} />
      </Field>
      <Picks options={options} value={value} onChange={onChange} />
    </div>
  );
}

// Formulaire en ligne : appelle `send()` puis prévient le parent.
function useSubmit(send, onDone) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await send();
      onDone();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  return { submit, error, busy };
}

async function remove(path, question, onChange, onError) {
  if (!window.confirm(question)) return;
  try {
    await api.del(path);
    onChange();
  } catch (e) {
    onError(e.message);
  }
}

// ----- Traitements ----------------------------------------------------------

function TreatmentForm({ hiveId, onDone, onCancel }) {
  const [t, setT] = useState({ product: "", dose: "", reason: "Varroa", started_on: todayValue(), ended_on: "", notes: "" });
  const set = (key) => (value) => setT((s) => ({ ...s, [key]: value }));
  const { submit, error, busy } = useSubmit(() => api.post(`/hives/${hiveId}/treatments`, t), onDone);

  return (
    <form onSubmit={submit} className="stack inline-form">
      <PickField label="Produit" value={t.product} onChange={set("product")} options={TREATMENT_PRODUCTS} required />
      <Field label="Dose" hint="Par exemple : 2 lanières, 1 plaquette.">
        <input value={t.dose} onChange={(e) => set("dose")(e.target.value)} />
      </Field>
      <PickField label="Motif" value={t.reason} onChange={set("reason")} options={TREATMENT_REASONS} />
      <div className="pair">
        <Field label="Début">
          <input type="date" value={t.started_on} onChange={(e) => set("started_on")(e.target.value)} required />
        </Field>
        <Field label="Fin" hint="Vide si en cours.">
          <input type="date" value={t.ended_on} min={t.started_on} onChange={(e) => set("ended_on")(e.target.value)} />
        </Field>
      </div>
      <Field label="Notes" hint="Numéro de lot, ordonnance…">
        <textarea rows={2} value={t.notes} onChange={(e) => set("notes")(e.target.value)} />
      </Field>
      <ErrorNote message={error} />
      <button className="btn btn--primary" disabled={busy}>Enregistrer le traitement</button>
      <button type="button" className="btn btn--ghost" onClick={onCancel}>Annuler</button>
    </form>
  );
}

export function Treatments({ hiveId, items, onChange, onError }) {
  const [adding, setAdding] = useState(false);
  const today = todayValue();

  const end = async (treatment) => {
    try {
      await api.put(`/treatments/${treatment.id}/end`, { ended_on: today });
      onChange();
    } catch (e) {
      onError(e.message);
    }
  };

  return (
    <section className="section">
      <h2>Traitements</h2>
      {items.length === 0 && !adding && <p className="muted">Aucun traitement enregistré.</p>}
      <ul className="records">
        {items.map((t) => {
          const running = t.started_on <= today && (!t.ended_on || t.ended_on >= today);
          return (
            <li key={t.id} className="record">
              <div className="record-head">
                <strong>
                  {t.product}
                  {running && <span className="tag tag--on">En cours</span>}
                </strong>
                <span className="record-tools">
                  {!t.ended_on && (
                    <button className="link-btn" onClick={() => end(t)}>Terminer aujourd'hui</button>
                  )}
                  <button
                    className="link-btn link-btn--danger"
                    onClick={() => remove(`/treatments/${t.id}`, "Supprimer ce traitement ?", onChange, onError)}
                  >
                    Supprimer
                  </button>
                </span>
              </div>
              <p className="record-sub">
                {t.ended_on
                  ? `Du ${formatDay(t.started_on)} au ${formatDay(t.ended_on)}`
                  : `Depuis le ${formatDay(t.started_on)}`}
                {t.reason ? ` · ${t.reason}` : ""}
                {t.dose ? ` · ${t.dose}` : ""}
              </p>
              {t.notes && <p className="notes">{t.notes}</p>}
            </li>
          );
        })}
      </ul>
      {adding ? (
        <TreatmentForm
          hiveId={hiveId}
          onCancel={() => setAdding(false)}
          onDone={() => {
            setAdding(false);
            onChange();
          }}
        />
      ) : (
        <button className="btn btn--ghost btn--small" onClick={() => setAdding(true)}>Ajouter un traitement</button>
      )}
    </section>
  );
}

// ----- Nourrissements -------------------------------------------------------

function FeedingForm({ hiveId, onDone, onCancel }) {
  const [f, setF] = useState({ fed_on: todayValue(), feed_type: "", quantity_kg: "" });
  const set = (key) => (value) => setF((s) => ({ ...s, [key]: value }));
  const { submit, error, busy } = useSubmit(
    () => api.post(`/hives/${hiveId}/feedings`, { ...f, quantity_kg: toNumberOrNull(f.quantity_kg) }),
    onDone,
  );

  return (
    <form onSubmit={submit} className="stack inline-form">
      <PickField label="Nourriture" value={f.feed_type} onChange={set("feed_type")} options={FEED_TYPES} required />
      <div className="pair">
        <Field label="Date">
          <input type="date" value={f.fed_on} onChange={(e) => set("fed_on")(e.target.value)} required />
        </Field>
        <Field label="Quantité (kg)" hint="1 L de sirop 50/50 ≈ 1,2 kg.">
          <input inputMode="decimal" value={f.quantity_kg} onChange={(e) => set("quantity_kg")(e.target.value)} />
        </Field>
      </div>
      <ErrorNote message={error} />
      <button className="btn btn--primary" disabled={busy}>Enregistrer le nourrissement</button>
      <button type="button" className="btn btn--ghost" onClick={onCancel}>Annuler</button>
    </form>
  );
}

export function Feedings({ hiveId, items, onChange, onError }) {
  const [adding, setAdding] = useState(false);
  const year = String(new Date().getFullYear());
  const yearTotal = items
    .filter((f) => f.fed_on.startsWith(year) && f.quantity_kg != null)
    .reduce((sum, f) => sum + f.quantity_kg, 0);

  return (
    <section className="section">
      <h2>Nourrissements</h2>
      {items.length === 0 && !adding && <p className="muted">Aucun nourrissement enregistré.</p>}
      {yearTotal > 0 && <p className="total">En {year} : <strong>{formatKg(yearTotal)}</strong></p>}
      <ul className="records">
        {items.map((f) => (
          <li key={f.id} className="record">
            <div className="record-head">
              <span>
                <strong>{f.feed_type}</strong>
                {f.quantity_kg != null && ` · ${formatKg(f.quantity_kg)}`}
              </span>
              <button
                className="link-btn link-btn--danger"
                onClick={() => remove(`/feedings/${f.id}`, "Supprimer ce nourrissement ?", onChange, onError)}
              >
                Supprimer
              </button>
            </div>
            <p className="record-sub">{formatDay(f.fed_on)}</p>
          </li>
        ))}
      </ul>
      {adding ? (
        <FeedingForm
          hiveId={hiveId}
          onCancel={() => setAdding(false)}
          onDone={() => {
            setAdding(false);
            onChange();
          }}
        />
      ) : (
        <button className="btn btn--ghost btn--small" onClick={() => setAdding(true)}>Ajouter un nourrissement</button>
      )}
    </section>
  );
}

// ----- Récoltes -------------------------------------------------------------

function HarvestForm({ hiveId, onDone, onCancel }) {
  const [h, setH] = useState({ harvested_on: todayValue(), quantity_kg: "", honey_type: "", notes: "" });
  const set = (key) => (value) => setH((s) => ({ ...s, [key]: value }));
  const { submit, error, busy } = useSubmit(
    () => api.post(`/hives/${hiveId}/harvests`, { ...h, quantity_kg: toNumberOrNull(h.quantity_kg) }),
    onDone,
  );

  return (
    <form onSubmit={submit} className="stack inline-form">
      <div className="pair">
        <Field label="Date">
          <input type="date" value={h.harvested_on} onChange={(e) => set("harvested_on")(e.target.value)} required />
        </Field>
        <Field label="Miel (kg)">
          <input inputMode="decimal" value={h.quantity_kg} onChange={(e) => set("quantity_kg")(e.target.value)} required />
        </Field>
      </div>
      <PickField label="Miel" value={h.honey_type} onChange={set("honey_type")} options={HONEY_TYPES} />
      <Field label="Notes" hint="Nombre de hausses, humidité…">
        <textarea rows={2} value={h.notes} onChange={(e) => set("notes")(e.target.value)} />
      </Field>
      <ErrorNote message={error} />
      <button className="btn btn--primary" disabled={busy}>Enregistrer la récolte</button>
      <button type="button" className="btn btn--ghost" onClick={onCancel}>Annuler</button>
    </form>
  );
}

export function Harvests({ hiveId, items, onChange, onError }) {
  const [adding, setAdding] = useState(false);

  // Totaux par année, la plus récente d'abord (les récoltes arrivent déjà triées).
  const byYear = [];
  for (const h of items) {
    const year = h.harvested_on.slice(0, 4);
    const last = byYear[byYear.length - 1];
    if (last?.year === year) last.kg += h.quantity_kg;
    else byYear.push({ year, kg: h.quantity_kg });
  }

  return (
    <section className="section">
      <h2>Récoltes</h2>
      {items.length === 0 && !adding && <p className="muted">Aucune récolte enregistrée.</p>}
      {byYear.length > 0 && (
        <p className="total">
          {byYear.map((y, i) => (
            <span key={y.year}>
              {i > 0 && " · "}
              {y.year} : <strong>{formatKg(y.kg)}</strong>
            </span>
          ))}
        </p>
      )}
      <ul className="records">
        {items.map((h) => (
          <li key={h.id} className="record">
            <div className="record-head">
              <span>
                <strong>{formatKg(h.quantity_kg)}</strong>
                {h.honey_type && ` · ${h.honey_type}`}
              </span>
              <button
                className="link-btn link-btn--danger"
                onClick={() => remove(`/harvests/${h.id}`, "Supprimer cette récolte ?", onChange, onError)}
              >
                Supprimer
              </button>
            </div>
            <p className="record-sub">{formatDay(h.harvested_on)}</p>
            {h.notes && <p className="notes">{h.notes}</p>}
          </li>
        ))}
      </ul>
      {adding ? (
        <HarvestForm
          hiveId={hiveId}
          onCancel={() => setAdding(false)}
          onDone={() => {
            setAdding(false);
            onChange();
          }}
        />
      ) : (
        <button className="btn btn--ghost btn--small" onClick={() => setAdding(true)}>Ajouter une récolte</button>
      )}
    </section>
  );
}
