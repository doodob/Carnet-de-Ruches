import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { hiveAlerts } from "../alerts.js";
import { api } from "../api.js";
import HiveIcon, { MAX_DRAWN_SUPERS } from "../components/HiveIcon.jsx";
import { ErrorNote, Loading } from "../components/ui.jsx";
import { STATUS_LABELS, daysAgo } from "../util.js";

// Regroupe les ruches par rucher, par ordre alphabétique ; les ruches sans rucher viennent en dernier.
function byApiary(hives) {
  const groups = new Map();
  for (const hive of hives) {
    const key = hive.apiary_id ?? "none";
    if (!groups.has(key)) groups.set(key, { key, name: hive.apiary_name ?? "Sans rucher", hives: [] });
    groups.get(key).hives.push(hive);
  }
  return [...groups.values()].sort((a, b) => {
    if (a.key === "none") return 1;
    if (b.key === "none") return -1;
    return a.name.localeCompare(b.name, "fr");
  });
}

function HiveTile({ hive, maxSupers }) {
  const veiled = hive.status !== "active";
  const supers = hive.supers_count ?? 0;
  const alerts = hiveAlerts(hive).length;
  return (
    <Link to={`/ruches/${hive.id}`} className={`hive-tile${veiled ? " is-veiled" : ""}`}>
      <HiveIcon supers={supers} maxSupers={maxSupers} queenColor={hive.queen?.marking_color} />
      <span className="hive-name">{hive.name}</span>
      <span className="sr-only">
        {`, ${supers} hausse${supers > 1 ? "s" : ""}`}
        {hive.queen?.marking_color ? `, reine marquée ${hive.queen.marking_color}` : ""}
      </span>
      <span className="hive-when">
        {hive.last_inspection ? `Visitée ${daysAgo(hive.last_inspection)}` : "Jamais visitée"}
      </span>
      {veiled && <span className="tag">{STATUS_LABELS[hive.status]}</span>}
      {hive.treating && <span className="tag tag--on">Traitement</span>}
      {alerts > 0 && <span className="tag tag--alert">! {alerts} alerte{alerts > 1 ? "s" : ""}</span>}
    </Link>
  );
}

export default function Hives() {
  const [hives, setHives] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/hives").then(setHives).catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <header className="page-head">
        <h1>Mes ruches</h1>
        <Link to="/ruches/nouvelle" className="btn btn--primary btn--small">
          Ajouter une ruche
        </Link>
      </header>

      <ErrorNote message={error} />
      {!hives && !error && <Loading />}

      {hives && hives.length === 0 && (
        <section className="empty">
          <p>Aucune ruche pour l'instant.</p>
          <p className="muted">Ajoute ta première ruche pour commencer à tenir son carnet de visites.</p>
          <Link to="/ruches/nouvelle" className="btn btn--primary">
            Ajouter ma première ruche
          </Link>
        </section>
      )}

      {hives &&
        byApiary(hives).map((group) => {
          const maxSupers = Math.min(
            MAX_DRAWN_SUPERS,
            Math.max(0, ...group.hives.map((h) => h.supers_count ?? 0)),
          );
          return (
            <section key={group.key} className="apiary">
              <h2>
                {group.name} <span className="muted apiary-count">{group.hives.length}</span>
              </h2>
              <ul className="apiary-row">
                {group.hives.map((hive) => (
                  <li key={hive.id}>
                    <HiveTile hive={hive} maxSupers={maxSupers} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
    </>
  );
}
