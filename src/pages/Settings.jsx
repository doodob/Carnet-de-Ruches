import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";
import { ErrorNote, Field, Loading } from "../components/ui.jsx";
import { formatCoords, mapUrl, toNumberOrNull } from "../util.js";

// ----- Ruchers --------------------------------------------------------------

function ApiaryForm({ initial, onDone, onCancel }) {
  const [a, setA] = useState({
    name: initial?.name ?? "",
    location: initial?.location ?? "",
    latitude: initial?.latitude ?? "",
    longitude: initial?.longitude ?? "",
    altitude_m: initial?.altitude_m ?? "",
    notes: initial?.notes ?? "",
  });
  const [error, setError] = useState("");
  const [geoMessage, setGeoMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (event) => setA((s) => ({ ...s, [key]: event.target.value }));

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setGeoMessage("Ce navigateur ne sait pas donner la position.");
      return;
    }
    setGeoMessage("Recherche de la position…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setA((s) => ({
          ...s,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
          altitude_m: pos.coords.altitude != null ? String(Math.round(pos.coords.altitude)) : s.altitude_m,
        }));
        setGeoMessage(`Position trouvée, précision d'environ ${Math.round(pos.coords.accuracy)} m.`);
      },
      () => setGeoMessage("Position indisponible. Autorise la localisation pour ce site dans le navigateur."),
      { enableHighAccuracy: true, timeout: 20000 },
    );
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const payload = {
      name: a.name,
      location: a.location || null,
      latitude: toNumberOrNull(a.latitude),
      longitude: toNumberOrNull(a.longitude),
      altitude_m: toNumberOrNull(a.altitude_m),
      notes: a.notes || null,
    };
    try {
      if (initial) await api.put(`/apiaries/${initial.id}`, payload);
      else await api.post("/apiaries", payload);
      onDone();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="stack inline-form">
      <Field label="Nom du rucher">
        <input value={a.name} onChange={set("name")} required />
      </Field>
      <Field label="Lieu">
        <input value={a.location} onChange={set("location")} placeholder="Commune, lieu-dit…" />
      </Field>
      <button type="button" className="btn btn--ghost" onClick={locate}>Utiliser ma position</button>
      {geoMessage && <p className="muted" role="status">{geoMessage}</p>}
      <div className="pair">
        <Field label="Latitude">
          <input inputMode="decimal" value={a.latitude} onChange={set("latitude")} placeholder="45.764043" />
        </Field>
        <Field label="Longitude">
          <input inputMode="decimal" value={a.longitude} onChange={set("longitude")} placeholder="4.835659" />
        </Field>
      </div>
      <Field label="Altitude (m)">
        <input inputMode="numeric" value={a.altitude_m} onChange={set("altitude_m")} />
      </Field>
      <Field label="Notes">
        <textarea rows={2} value={a.notes} onChange={set("notes")} />
      </Field>
      <ErrorNote message={error} />
      <button className="btn btn--primary" disabled={busy}>Enregistrer le rucher</button>
      <button type="button" className="btn btn--ghost" onClick={onCancel}>Annuler</button>
    </form>
  );
}

function Apiaries({ apiaries, reload, setError }) {
  const [editing, setEditing] = useState(null); // null | "new" | id

  const remove = async (apiary) => {
    if (!window.confirm(`Supprimer le rucher « ${apiary.name} » ? Ses ruches seront conservées, sans rucher.`)) return;
    try {
      await api.del(`/apiaries/${apiary.id}`);
      reload();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <section className="section">
      <h2>Ruchers</h2>
      {apiaries.length === 0 && editing !== "new" && (
        <p className="muted">Aucun rucher. Ajoutes-en un pour y placer tes ruches et enregistrer sa position GPS.</p>
      )}
      <ul className="rows">
        {apiaries.map((a) => (
          <li key={a.id} className="plain-row">
            {editing === a.id ? (
              <ApiaryForm
                initial={a}
                onCancel={() => setEditing(null)}
                onDone={() => {
                  setEditing(null);
                  reload();
                }}
              />
            ) : (
              <>
                <div className="row-main">
                  <span className="row-title">{a.name}</span>
                  {a.location && <span className="row-sub">{a.location}</span>}
                  {a.latitude != null && a.longitude != null && (
                    <a href={mapUrl(a.latitude, a.longitude)} target="_blank" rel="noreferrer" className="row-sub">
                      {formatCoords(a.latitude, a.longitude)}
                      {a.altitude_m != null ? `, ${a.altitude_m} m` : ""}
                    </a>
                  )}
                </div>
                <div className="row-actions">
                  <button className="link-btn" onClick={() => setEditing(a.id)}>Modifier</button>
                  <button className="link-btn link-btn--danger" onClick={() => remove(a)}>Supprimer</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      {editing === "new" ? (
        <ApiaryForm
          onCancel={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            reload();
          }}
        />
      ) : (
        <button className="btn btn--ghost btn--small" onClick={() => setEditing("new")}>Ajouter un rucher</button>
      )}
    </section>
  );
}

// ----- Modèles de ruche -----------------------------------------------------

function ModelForm({ initial, onDone, onCancel }) {
  const [m, setM] = useState({
    name: initial?.name ?? "",
    body_frames: initial?.body_frames ?? "10",
    super_frames: initial?.super_frames ?? "10",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key) => (event) => setM((s) => ({ ...s, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const payload = {
      name: m.name,
      body_frames: toNumberOrNull(m.body_frames),
      super_frames: toNumberOrNull(m.super_frames),
    };
    try {
      if (initial) await api.put(`/models/${initial.id}`, payload);
      else await api.post("/models", payload);
      onDone();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="stack inline-form">
      <Field label="Nom du modèle">
        <input value={m.name} onChange={set("name")} placeholder="Dadant 8" required />
      </Field>
      <div className="pair">
        <Field label="Cadres du corps">
          <input inputMode="numeric" value={m.body_frames} onChange={set("body_frames")} required />
        </Field>
        <Field label="Cadres de hausse">
          <input inputMode="numeric" value={m.super_frames} onChange={set("super_frames")} required />
        </Field>
      </div>
      <ErrorNote message={error} />
      <button className="btn btn--primary" disabled={busy}>Enregistrer le modèle</button>
      <button type="button" className="btn btn--ghost" onClick={onCancel}>Annuler</button>
    </form>
  );
}

function Models({ models, reload, setError }) {
  const [editing, setEditing] = useState(null);

  const remove = async (model) => {
    if (!window.confirm(`Supprimer le modèle « ${model.name} » ?`)) return;
    try {
      await api.del(`/models/${model.id}`);
      reload();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <section className="section">
      <h2>Modèles de ruche</h2>
      <ul className="rows">
        {models.map((m) => (
          <li key={m.id} className="plain-row">
            {editing === m.id ? (
              <ModelForm
                initial={m}
                onCancel={() => setEditing(null)}
                onDone={() => {
                  setEditing(null);
                  reload();
                }}
              />
            ) : (
              <>
                <div className="row-main">
                  <span className="row-title">{m.name}</span>
                  <span className="row-sub">
                    <span>{m.body_frames} cadres de corps</span>
                    <span>{m.super_frames} cadres de hausse</span>
                  </span>
                </div>
                <div className="row-actions">
                  <button className="link-btn" onClick={() => setEditing(m.id)}>Modifier</button>
                  <button className="link-btn link-btn--danger" onClick={() => remove(m)}>Supprimer</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      {editing === "new" ? (
        <ModelForm
          onCancel={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            reload();
          }}
        />
      ) : (
        <button className="btn btn--ghost btn--small" onClick={() => setEditing("new")}>Ajouter un modèle</button>
      )}
    </section>
  );
}

// ----- Page -----------------------------------------------------------------

export default function Settings({ onLogout }) {
  const [apiaries, setApiaries] = useState(null);
  const [models, setModels] = useState(null);
  const [error, setError] = useState("");

  const reload = useCallback(() => {
    setError("");
    Promise.all([api.get("/apiaries"), api.get("/models")])
      .then(([a, m]) => {
        setApiaries(a);
        setModels(m);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(reload, [reload]);

  const logout = async () => {
    try {
      await api.post("/logout");
    } finally {
      onLogout();
    }
  };

  return (
    <div className="narrow">
      <h1>Réglages</h1>
      <ErrorNote message={error} />
      {(!apiaries || !models) && !error && <Loading />}
      {apiaries && models && (
        <>
          <Apiaries apiaries={apiaries} reload={reload} setError={setError} />
          <Models models={models} reload={reload} setError={setError} />
        </>
      )}
      <section className="section">
        <button className="btn btn--ghost" onClick={logout}>Se déconnecter</button>
      </section>
    </div>
  );
}
