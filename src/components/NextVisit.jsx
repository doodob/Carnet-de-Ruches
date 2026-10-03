// Prochaine visite prévue : un choix rapide (dans 7, 10, 14 ou 21 jours) ou une date libre.

import { useState } from "react";
import { api } from "../api.js";
import { ErrorNote, Group, Segmented } from "./ui.jsx";
import { addDays, formatDay, relativeDay, todayValue } from "../util.js";

const DELAYS = [7, 10, 14, 21];

// `base` : la date à partir de laquelle on compte (AAAA-MM-JJ).
export function NextVisitPicker({ base, value, onChange, label = "Prochaine visite", hint }) {
  return (
    <Group label={label} hint={hint}>
      <Segmented
        clearable
        value={value || null}
        onChange={(v) => onChange(v ?? "")}
        options={DELAYS.map((n) => ({ value: addDays(base, n), label: `${n} j` }))}
      />
      <input
        type="date"
        aria-label={`${label} : date`}
        value={value}
        min={base}
        onChange={(e) => onChange(e.target.value)}
      />
    </Group>
  );
}

export default function NextVisit({ hive, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(hive.next_visit_on ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async (next) => {
    setBusy(true);
    setError("");
    try {
      await api.put(`/hives/${hive.id}/next-visit`, { next_visit_on: next || null });
      setEditing(false);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!editing) {
    return (
      <div className="next-visit">
        <span>
          <span className="muted">Prochaine visite</span>{" "}
          <strong>
            {hive.next_visit_on
              ? `${formatDay(hive.next_visit_on)} (${relativeDay(hive.next_visit_on)})`
              : "non prévue"}
          </strong>
        </span>
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            setValue(hive.next_visit_on ?? "");
            setEditing(true);
          }}
        >
          {hive.next_visit_on ? "Modifier" : "Planifier"}
        </button>
      </div>
    );
  }

  return (
    <div className="stack inline-form">
      <NextVisitPicker base={todayValue()} value={value} onChange={setValue} />
      <ErrorNote message={error} />
      <button type="button" className="btn btn--primary" disabled={busy || !value} onClick={() => save(value)}>
        Enregistrer la date
      </button>
      {hive.next_visit_on && (
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => save(null)}>
          Ne plus prévoir de visite
        </button>
      )}
      <button type="button" className="btn btn--ghost" onClick={() => setEditing(false)}>Annuler</button>
    </div>
  );
}
