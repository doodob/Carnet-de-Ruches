import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { hiveAlerts } from "../alerts.js";
import { api } from "../api.js";
import { ErrorNote, Loading, QueenDot } from "../components/ui.jsx";
import { TEMPER_LABELS, daysAgo, formatDay, relativeDay } from "../util.js";

// Écart avec la visite précédente : « +2 », « −1 », rien si une valeur manque.
function trend(last, prev, key) {
  if (last?.[key] == null || prev?.[key] == null) return "";
  const d = last[key] - prev[key];
  if (d === 0) return " (=)";
  return d > 0 ? ` (+${d})` : ` (−${-d})`;
}

const yesNo = (v) => (v === true ? "Oui" : v === false ? "Non" : "–");

export default function Dashboard() {
  const [hives, setHives] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/hives").then(setHives).catch((e) => setError(e.message));
  }, []);

  if (!hives) return error ? <ErrorNote message={error} /> : <Loading />;

  // Les ruches à surveiller d'abord, puis celles visitées il y a le plus longtemps.
  const rows = hives
    .filter((h) => h.status === "active")
    .map((h) => ({ hive: h, last: h.recent[0], prev: h.recent[1], alerts: hiveAlerts(h) }))
    .sort((a, b) => {
      if (b.alerts.length !== a.alerts.length) return b.alerts.length - a.alerts.length;
      const ta = a.last ? new Date(a.last.inspected_at).getTime() : 0;
      const tb = b.last ? new Date(b.last.inspected_at).getTime() : 0;
      return ta - tb;
    });
  const watched = rows.filter((r) => r.alerts.length > 0).length;

  return (
    <>
      <h1>Tableau de bord</h1>
      <p className="lead">
        {rows.length === 0
          ? "Aucune ruche active."
          : watched === 0
            ? `${rows.length} ruche${rows.length > 1 ? "s" : ""} active${rows.length > 1 ? "s" : ""}, rien à signaler.`
            : `${watched} ruche${watched > 1 ? "s" : ""} à surveiller sur ${rows.length}.`}
      </p>

      {rows.length > 0 && (
        <table className="board">
          <thead>
            <tr>
              <th scope="col">Ruche</th>
              <th scope="col">Dernière visite</th>
              <th scope="col">Couvain</th>
              <th scope="col">Abeilles</th>
              <th scope="col">Œufs</th>
              <th scope="col">Comportement</th>
              <th scope="col">Hausses</th>
              <th scope="col">Prochaine visite</th>
              <th scope="col">À surveiller</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ hive, last, prev, alerts }) => (
              <tr key={hive.id} className={alerts.length ? "has-alerts" : undefined}>
                <th scope="row">
                  <Link to={`/ruches/${hive.id}`}>{hive.name}</Link>
                  {hive.queen && <QueenDot color={hive.queen.marking_color} size={14} />}
                  {hive.apiary_name && <span className="board-sub">{hive.apiary_name}</span>}
                </th>
                <td data-label="Dernière visite">{last ? daysAgo(last.inspected_at) : "jamais"}</td>
                <td data-label="Couvain">
                  {last?.brood_frames != null ? `${last.brood_frames} / ${hive.body_frames}${trend(last, prev, "brood_frames")}` : "–"}
                </td>
                <td data-label="Abeilles">
                  {last?.bee_frames != null ? `${last.bee_frames}${trend(last, prev, "bee_frames")}` : "–"}
                </td>
                <td data-label="Œufs">{yesNo(last?.eggs_seen)}</td>
                <td data-label="Comportement">{last?.temper ? TEMPER_LABELS[last.temper] : "–"}</td>
                <td data-label="Hausses">{last?.supers_count ?? "–"}</td>
                <td data-label="Prochaine visite">
                  {hive.next_visit_on ? `${formatDay(hive.next_visit_on)} (${relativeDay(hive.next_visit_on)})` : "–"}
                </td>
                <td data-label="À surveiller" className="board-alerts-cell">
                  {alerts.length === 0 ? (
                    "–"
                  ) : (
                    <ul className="board-alerts">
                      {alerts.map((a) => (
                        <li key={a.key}>
                          <span className="alert-sign" aria-hidden="true">!</span>
                          {a.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
