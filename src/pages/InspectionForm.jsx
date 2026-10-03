import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import FrameRow, { FrameLegend } from "../components/FrameRow.jsx";
import { NextVisitPicker } from "../components/NextVisit.jsx";
import { PhotoGallery, PhotoPicker } from "../components/Photos.jsx";
import { Chips, ErrorNote, Field, Group, Loading, Segmented, Stepper, YesNo } from "../components/ui.jsx";
import { preparePhoto, photoForm } from "../photos.js";
import { ACTIONS, SKY, TEMPER_LABELS, WIND, toLocalInputValue, toNumberOrNull, todayValue } from "../util.js";
import { fetchWeather } from "../weather.js";

// Une fonction, pas une constante : la date proposée est celle de l'ouverture du formulaire.
const emptyForm = () => ({
  inspected_at: toLocalInputValue(),
  temperature_c: "",
  wind: null,
  sky: null,
  queen_seen: null,
  eggs_seen: null,
  queen_cells: null,
  bee_frames: null,
  supers_count: null,
  temper: null,
  actions: [],
  notes: "",
  next_visit_on: "",
});

// Une visite enregistrée, remise sous la forme du formulaire.
function toForm(v) {
  return {
    ...emptyForm(),
    inspected_at: toLocalInputValue(new Date(v.inspected_at)),
    temperature_c: v.temperature_c == null ? "" : String(v.temperature_c).replace(".", ","),
    wind: v.wind,
    sky: v.sky,
    queen_seen: v.queen_seen,
    eggs_seen: v.eggs_seen,
    queen_cells: v.queen_cells,
    bee_frames: v.bee_frames,
    supers_count: v.supers_count,
    temper: v.temper,
    actions: v.actions ?? [],
    notes: v.notes ?? "",
  };
}

// Nouvelle visite : /ruches/:id/visite. Modification : /visites/:visitId/modifier.
export default function InspectionForm() {
  const { id: hiveParam, visitId } = useParams();
  const editing = Boolean(visitId);
  const navigate = useNavigate();

  const [hive, setHive] = useState(null);
  const [layout, setLayout] = useState([]);
  const [prefilled, setPrefilled] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");
  const [f, setF] = useState(emptyForm);
  const [savedPhotos, setSavedPhotos] = useState([]);
  const [pending, setPending] = useState([]); // { key, photo, thumb, preview }
  // Une fois la visite créée, un nouvel essai ne la recrée pas : il ne renvoie que les photos manquantes.
  const [savedId, setSavedId] = useState(visitId ? Number(visitId) : null);

  const set = (key) => (value) => setF((s) => ({ ...s, [key]: value }));

  // Météo préremplie depuis les coordonnées du rucher ; un champ corrigé à la main n'est plus écrasé.
  // En modification, la météo enregistrée est gardée tant que la date ne change pas.
  const [weatherNote, setWeatherNote] = useState("");
  const manual = useRef({});
  const loadedDate = useRef(null);
  const setWeather = (key) => (value) => {
    manual.current[key] = true;
    set(key)(value);
  };
  const latitude = hive?.latitude;
  const longitude = hive?.longitude;

  useEffect(() => {
    if (!hive) return undefined;
    if (editing && f.inspected_at === loadedDate.current) return undefined;
    if (latitude == null || longitude == null) {
      setWeatherNote("Ajoute les coordonnées du rucher dans les réglages pour remplir la météo automatiquement.");
      return undefined;
    }
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(f.inspected_at)) return undefined;

    const controller = new AbortController();
    // Petite attente : le champ date change à chaque chiffre tapé.
    const timer = setTimeout(async () => {
      setWeatherNote("Recherche de la météo…");
      try {
        const w = await fetchWeather(latitude, longitude, f.inspected_at, controller.signal);
        setF((s) => ({
          ...s,
          temperature_c:
            manual.current.temperature_c || w.temperature_c == null ? s.temperature_c : String(w.temperature_c).replace(".", ","),
          wind: manual.current.wind || !w.wind ? s.wind : w.wind,
          sky: manual.current.sky || !w.sky ? s.sky : w.sky,
        }));
        const details = [
          w.temperature_c != null && `${String(w.temperature_c).replace(".", ",")} °C`,
          w.wind_kmh != null && `vent ${w.wind_kmh} km/h`,
          w.cloud_cover != null && `nuages ${w.cloud_cover} %`,
        ].filter(Boolean);
        setWeatherNote(`Météo du rucher vers ${w.hour} h : ${details.join(", ")}. Corrige si besoin.`);
      } catch (e) {
        if (e.name === "AbortError") return;
        // fetch lève une TypeError quand le réseau ne répond pas (le message varie selon le navigateur).
        setWeatherNote(`${e instanceof TypeError ? "Météo injoignable." : e.message} Saisis-la à la main.`);
      }
    }, 600);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [hive, editing, latitude, longitude, f.inspected_at]);

  useEffect(() => {
    if (editing) {
      api
        .get(`/inspections/${visitId}`)
        .then(async (visit) => {
          const detail = await api.get(`/hives/${visit.hive_id}`);
          const h = detail.hive;
          const form = toForm(visit);
          loadedDate.current = form.inspected_at;
          setF(form);
          setLayout(visit.frame_layout ?? Array(h.body_frames).fill("empty"));
          setSavedPhotos(visit.photos ?? []);
          setHive(h);
        })
        .catch((e) => setError(e.message));
      return;
    }
    Promise.all([api.get(`/hives/${hiveParam}`), api.get(`/hives/${hiveParam}/inspections`)])
      .then(([detail, list]) => {
        const h = detail.hive;
        const last = list[0];
        if (last?.frame_layout?.length === h.body_frames) {
          setLayout(last.frame_layout);
          setPrefilled(true);
        } else {
          setLayout(Array(h.body_frames).fill("empty"));
        }
        if (last?.supers_count != null) setF((s) => ({ ...s, supers_count: last.supers_count }));
        setHive(h);
      })
      .catch((e) => setError(e.message));
  }, [editing, visitId, hiveParam]);

  // Les aperçus locaux sont libérés quand on quitte la page.
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  useEffect(() => () => pendingRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), []);

  const addPhotos = async (files) => {
    setError("");
    for (const file of files) {
      try {
        const prepared = await preparePhoto(file);
        setPending((list) => [...list, { ...prepared, key: `${Date.now()}-${Math.random()}` }]);
      } catch (e) {
        setError(e.message);
      }
    }
  };

  const removePending = (photo) => {
    URL.revokeObjectURL(photo.preview);
    setPending((list) => list.filter((p) => p.key !== photo.key));
  };

  const deleteSaved = async (photo) => {
    if (!window.confirm("Supprimer cette photo ?")) return;
    try {
      await api.del(`/photos/${photo.id}`);
      setSavedPhotos((list) => list.filter((p) => p.id !== photo.id));
    } catch (e) {
      setError(e.message);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      inspected_at: new Date(f.inspected_at).toISOString(),
      temperature_c: toNumberOrNull(f.temperature_c),
      wind: f.wind,
      sky: f.sky,
      queen_seen: f.queen_seen,
      eggs_seen: f.eggs_seen,
      queen_cells: f.queen_cells,
      bee_frames: f.bee_frames,
      supers_count: f.supers_count,
      temper: f.temper,
      actions: f.actions,
      frame_layout: layout,
      notes: f.notes || null,
      next_visit_on: f.next_visit_on || null,
    };

    let inspectionId = savedId;
    try {
      setProgress("Enregistrement de la visite…");
      if (inspectionId) {
        await api.put(`/inspections/${inspectionId}`, payload);
      } else {
        inspectionId = (await api.post(`/hives/${hive.id}/inspections`, payload)).id;
        setSavedId(inspectionId);
      }
    } catch (e) {
      setError(e.message);
      setSaving(false);
      setProgress("");
      return;
    }

    // Les photos partent une à une ; celles déjà envoyées quittent la liste, un nouvel essai reprend les autres.
    const queue = [...pending];
    for (const [n, photo] of queue.entries()) {
      setProgress(`Envoi des photos (${n + 1} sur ${queue.length})…`);
      try {
        await api.upload(`/inspections/${inspectionId}/photos`, photoForm(photo));
        URL.revokeObjectURL(photo.preview);
        setPending((list) => list.filter((p) => p.key !== photo.key));
      } catch (e) {
        setError(
          `La visite est enregistrée, mais une photo n'a pas pu partir (${e.message}). ` +
            "Réessaie d'enregistrer : seules les photos restantes seront envoyées.",
        );
        setSaving(false);
        setProgress("");
        return;
      }
    }
    navigate(`/ruches/${hive.id}`, { replace: true });
  };

  if (!hive) return error ? <ErrorNote message={error} /> : <Loading />;

  return (
    <div className="narrow">
      <Link to={`/ruches/${hive.id}`} className="back">{hive.name}</Link>
      <h1>{editing ? "Modifier la visite" : "Nouvelle visite"}</h1>

      <form onSubmit={submit} className="stack">
        <Field
          label="Date et heure de la visite"
          hint={editing ? undefined : "Change-la si tu saisis la visite après coup."}
        >
          <input
            type="datetime-local"
            value={f.inspected_at}
            max={toLocalInputValue()}
            onChange={(e) => set("inspected_at")(e.target.value)}
            required
          />
        </Field>

        <Group
          label="Cadres du corps"
          hint={
            prefilled
              ? "Repris de la dernière visite : corrige ce qui a changé. Appuie sur un cadre pour changer son contenu."
              : "Appuie sur un cadre pour changer son contenu : vide, bâti, couvain, miel, pollen, partition isolante."
          }
        >
          <FrameRow frames={layout} onChange={setLayout} />
          <FrameLegend frames={layout} />
        </Group>

        <Group label="Cadres couverts d'abeilles">
          <Stepper value={f.bee_frames} onChange={set("bee_frames")} min={0} max={hive.body_frames} label="Cadres couverts d'abeilles" />
        </Group>

        <Group label="Reine vue"><YesNo value={f.queen_seen} onChange={set("queen_seen")} /></Group>
        <Group label="Œufs vus"><YesNo value={f.eggs_seen} onChange={set("eggs_seen")} /></Group>
        <Group label="Cellules royales"><YesNo value={f.queen_cells} onChange={set("queen_cells")} /></Group>

        <Group label="Hausses posées">
          <Stepper value={f.supers_count} onChange={set("supers_count")} min={0} max={9} label="Nombre de hausses" />
        </Group>

        <Group label="Comportement" hint={f.temper ? TEMPER_LABELS[f.temper] : "De 1 (très calme) à 5 (agressive)."}>
          <Segmented
            clearable
            value={f.temper}
            onChange={set("temper")}
            options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))}
          />
        </Group>

        <Group label="Ce que tu as fait">
          <Chips options={ACTIONS} value={f.actions} onChange={set("actions")} />
        </Group>

        <Field label="Notes">
          <textarea rows={4} value={f.notes} onChange={(e) => set("notes")(e.target.value)} />
        </Field>

        <Group label="Photos" hint="Réduites avant l'envoi. Elles partent quand tu enregistres la visite.">
          <PhotoGallery photos={savedPhotos} onDelete={deleteSaved} />
          <PhotoPicker pending={pending} onAdd={addPhotos} onRemove={removePending} disabled={saving} />
        </Group>

        {!editing && (
          <NextVisitPicker
            base={f.inspected_at.slice(0, 10) || todayValue()}
            value={f.next_visit_on}
            onChange={set("next_visit_on")}
            hint="Facultatif. À compter du jour de la visite."
          />
        )}

        <fieldset className="section">
          <legend>Météo</legend>
          {weatherNote && <p className="muted" role="status">{weatherNote}</p>}
          <Field label="Température (°C)">
            <input inputMode="decimal" value={f.temperature_c} onChange={(e) => setWeather("temperature_c")(e.target.value)} />
          </Field>
          <Group label="Vent"><Segmented clearable value={f.wind} onChange={setWeather("wind")} options={WIND} /></Group>
          <Group label="Ciel"><Segmented clearable value={f.sky} onChange={setWeather("sky")} options={SKY} /></Group>
        </fieldset>

        <ErrorNote message={error} />
        {progress && <p className="muted" role="status">{progress}</p>}
        <button className="btn btn--primary" disabled={saving}>
          {saving ? "Enregistrement…" : editing ? "Enregistrer les modifications" : "Enregistrer la visite"}
        </button>
        {editing && <Link to={`/ruches/${hive.id}`} className="btn btn--ghost">Annuler</Link>}
      </form>
    </div>
  );
}
