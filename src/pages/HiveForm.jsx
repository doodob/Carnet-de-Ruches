import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { ErrorNote, Field, Loading } from "../components/ui.jsx";
import { MARKINGS, ORIGINS, STATUS_LABELS, markingForYear, toNumberOrNull } from "../util.js";

const EMPTY_HIVE = { name: "", model_id: "", apiary_id: "", installed_on: "", origin: "", status: "active", notes: "" };
const EMPTY_QUEEN = { birth_year: "", strain: "", origin: "", marking_color: "", introduced_on: "" };

export default function HiveForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();

  const [models, setModels] = useState(null);
  const [apiaries, setApiaries] = useState([]);
  const [form, setForm] = useState(EMPTY_HIVE);
  const [queen, setQueen] = useState(EMPTY_QUEEN);
  const [markingTouched, setMarkingTouched] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/models"),
      api.get("/apiaries"),
      editing ? api.get(`/hives/${id}`) : Promise.resolve(null),
    ])
      .then(([modelList, apiaryList, detail]) => {
        setModels(modelList);
        setApiaries(apiaryList);
        if (detail) {
          const h = detail.hive;
          setForm({
            name: h.name,
            model_id: String(h.model_id),
            apiary_id: h.apiary_id ? String(h.apiary_id) : "",
            installed_on: h.installed_on ?? "",
            origin: h.origin ?? "",
            status: h.status,
            notes: h.notes ?? "",
          });
        } else if (modelList.length === 1) {
          setForm((f) => ({ ...f, model_id: String(modelList[0].id) }));
        }
      })
      .catch((e) => setError(e.message));
  }, [id, editing]);

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const setQ = (key) => (event) => setQueen((q) => ({ ...q, [key]: event.target.value }));

  const onBirthYear = (event) => {
    const value = event.target.value;
    setQueen((q) => ({
      ...q,
      birth_year: value,
      marking_color: markingTouched ? q.marking_color : markingForYear(value),
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      name: form.name,
      model_id: Number(form.model_id),
      apiary_id: form.apiary_id ? Number(form.apiary_id) : null,
      installed_on: form.installed_on || null,
      origin: form.origin || null,
      status: form.status,
      notes: form.notes || null,
    };
    try {
      if (editing) {
        await api.put(`/hives/${id}`, payload);
        navigate(`/ruches/${id}`);
      } else {
        const created = await api.post("/hives", {
          ...payload,
          queen: { ...queen, birth_year: toNumberOrNull(queen.birth_year) },
        });
        navigate(`/ruches/${created.id}`);
      }
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Supprimer cette ruche et tout son historique ? Cette action est définitive.")) return;
    try {
      await api.del(`/hives/${id}`);
      navigate("/");
    } catch (e) {
      setError(e.message);
    }
  };

  if (!models) return error ? <ErrorNote message={error} /> : <Loading />;

  if (models.length === 0) {
    return (
      <>
        <h1>Nouvelle ruche</h1>
        <p>Il faut d'abord créer un modèle de ruche (Dadant 10, Dadant 8…).</p>
        <Link to="/reglages" className="btn btn--primary">Aller aux réglages</Link>
      </>
    );
  }

  return (
    <>
      <h1>{editing ? "Modifier la ruche" : "Nouvelle ruche"}</h1>
      <form onSubmit={submit} className="stack">
        <Field label="Nom ou numéro">
          <input value={form.name} onChange={set("name")} placeholder="Ruche 1" required />
        </Field>

        <Field label="Modèle" hint="Le nombre de cadres du formulaire de visite en dépend.">
          <select value={form.model_id} onChange={set("model_id")} required>
            <option value="" disabled>Choisir un modèle</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.body_frames} cadres)
              </option>
            ))}
          </select>
        </Field>

        <Field label="Rucher">
          <select value={form.apiary_id} onChange={set("apiary_id")}>
            <option value="">Aucun rucher</option>
            {apiaries.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Date de mise en place">
          <input type="date" value={form.installed_on} onChange={set("installed_on")} />
        </Field>

        <Field label="Origine de la colonie">
          <select value={form.origin} onChange={set("origin")}>
            <option value="">Non précisée</option>
            {ORIGINS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </Field>

        {editing && (
          <Field label="Statut">
            <select value={form.status} onChange={set("status")}>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Notes">
          <textarea rows={3} value={form.notes} onChange={set("notes")} />
        </Field>

        {!editing && (
          <fieldset className="section">
            <legend>Reine (facultatif)</legend>
            <Field label="Année de naissance" hint="La couleur de marquage est proposée automatiquement.">
              <input inputMode="numeric" value={queen.birth_year} onChange={onBirthYear} placeholder="2026" />
            </Field>
            <Field label="Marquage">
              <select
                value={queen.marking_color}
                onChange={(e) => {
                  setMarkingTouched(true);
                  setQ("marking_color")(e);
                }}
              >
                <option value="">Non marquée</option>
                {MARKINGS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Souche">
              <input value={queen.strain} onChange={setQ("strain")} placeholder="Buckfast, Carnica, locale…" />
            </Field>
            <Field label="Origine de la reine">
              <input value={queen.origin} onChange={setQ("origin")} placeholder="Éleveur, élevage maison, essaim…" />
            </Field>
          </fieldset>
        )}

        <ErrorNote message={error} />
        <button className="btn btn--primary" disabled={saving}>
          {saving ? "Enregistrement…" : editing ? "Enregistrer les modifications" : "Créer la ruche"}
        </button>
        <Link to={editing ? `/ruches/${id}` : "/"} className="btn btn--ghost">Annuler</Link>
        {editing && (
          <button type="button" className="btn btn--danger" onClick={remove}>
            Supprimer la ruche
          </button>
        )}
      </form>
    </>
  );
}
