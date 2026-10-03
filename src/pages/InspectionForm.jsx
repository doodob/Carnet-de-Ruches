import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import FrameRow, { FrameLegend } from "../components/FrameRow.jsx";
import { Chips, ErrorNote, Field, Group, Loading, Segmented, Stepper, YesNo } from "../components/ui.jsx";
import { ACTIONS, SKY, TEMPER_LABELS, WIND, toLocalInputValue, toNumberOrNull } from "../util.js";

export default function InspectionForm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [hive, setHive] = useState(null);
  const [layout, setLayout] = useState([]);
  const [prefilled, setPrefilled] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
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
  });

  const set = (key) => (value) => setF((s) => ({ ...s, [key]: value }));

  useEffect(() => {
    Promise.all([api.get(`/hives/${id}`), api.get(`/hives/${id}/inspections`)])
      .then(([detail, list]) => {
        const h = detail.hive;
        setHive(h);
        const last = list[0];
        if (last?.frame_layout?.length === h.body_frames) {
          setLayout(last.frame_layout);
          setPrefilled(true);
        } else {
          setLayout(Array(h.body_frames).fill("empty"));
        }
        if (last?.supers_count != null) setF((s) => ({ ...s, supers_count: last.supers_count }));
      })
      .catch((e) => setError(e.message));
  }, [id]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post(`/hives/${id}/inspections`, {
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
      });
      navigate(`/ruches/${id}`, { replace: true });
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  if (!hive) return error ? <ErrorNote message={error} /> : <Loading />;

  return (
    <>
      <Link to={`/ruches/${id}`} className="back">{hive.name}</Link>
      <h1>Nouvelle visite</h1>

      <form onSubmit={submit} className="stack">
        <Group
          label="Cadres du corps"
          hint={
            prefilled
              ? "Repris de la dernière visite : corrige ce qui a changé. Appuie sur un cadre pour changer son contenu."
              : "Appuie sur un cadre pour changer son contenu : vide, bâti, couvain, miel, pollen."
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

        <fieldset className="section">
          <legend>Conditions</legend>
          <Field label="Date et heure">
            <input type="datetime-local" value={f.inspected_at} onChange={(e) => set("inspected_at")(e.target.value)} required />
          </Field>
          <Field label="Température (°C)">
            <input inputMode="decimal" value={f.temperature_c} onChange={(e) => set("temperature_c")(e.target.value)} />
          </Field>
          <Group label="Vent"><Segmented clearable value={f.wind} onChange={set("wind")} options={WIND} /></Group>
          <Group label="Ciel"><Segmented clearable value={f.sky} onChange={set("sky")} options={SKY} /></Group>
        </fieldset>

        <ErrorNote message={error} />
        <button className="btn btn--primary" disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer la visite"}
        </button>
      </form>
    </>
  );
}
