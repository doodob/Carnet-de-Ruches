import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { ErrorNote, Loading, QueenDot } from "../components/ui.jsx";
import { STATUS_LABELS, daysAgo } from "../util.js";

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

      {hives && hives.length > 0 && (
        <ul className="rows">
          {hives.map((hive) => (
            <li key={hive.id}>
              <Link to={`/ruches/${hive.id}`} className="row">
                <div className="row-main">
                  <span className="row-title">{hive.name}</span>
                  <span className="row-sub">
                    <span>{hive.model_name}</span>
                    {hive.apiary_name && <span>{hive.apiary_name}</span>}
                  </span>
                </div>
                <div className="row-side">
                  {hive.status !== "active" && <span className="tag">{STATUS_LABELS[hive.status]}</span>}
                  {hive.queen && <QueenDot color={hive.queen.marking_color} />}
                  <span className="row-when">
                    {hive.last_inspection ? `Visitée ${daysAgo(hive.last_inspection)}` : "Jamais visitée"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
