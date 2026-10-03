import { useEffect, useState } from "react";
import { BrowserRouter, NavLink, Navigate, Route, Routes } from "react-router-dom";
import { api } from "./api.js";
import Login from "./pages/Login.jsx";
import Hives from "./pages/Hives.jsx";
import HiveForm from "./pages/HiveForm.jsx";
import HiveDetail from "./pages/HiveDetail.jsx";
import InspectionForm from "./pages/InspectionForm.jsx";
import Settings from "./pages/Settings.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Season from "./pages/Season.jsx";

export default function App() {
  const [auth, setAuth] = useState("loading"); // loading | in | out | error
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/me")
      .then((r) => setAuth(r.authenticated ? "in" : "out"))
      .catch((e) => {
        setError(e.message);
        setAuth("error");
      });
    const onUnauthorized = () => setAuth("out");
    window.addEventListener("carnet:unauthorized", onUnauthorized);
    return () => window.removeEventListener("carnet:unauthorized", onUnauthorized);
  }, []);

  if (auth === "loading") return <main className="page"><p className="muted">Chargement…</p></main>;
  if (auth === "error") {
    return (
      <main className="page">
        <h1>Impossible de joindre le serveur</h1>
        <p className="error-note" role="alert">{error}</p>
      </main>
    );
  }
  if (auth === "out") return <Login onSuccess={() => setAuth("in")} />;

  return (
    <BrowserRouter>
      <div className="shell">
        <nav className="tabbar" aria-label="Navigation principale">
          <span className="brand">Carnet de rucher</span>
          <NavLink to="/" end className={({ isActive }) => `tab${isActive ? " is-on" : ""}`}>
            Ruches
          </NavLink>
          <NavLink to="/tableau" className={({ isActive }) => `tab${isActive ? " is-on" : ""}`}>
            Tableau
          </NavLink>
          <NavLink to="/bilan" className={({ isActive }) => `tab${isActive ? " is-on" : ""}`}>
            Bilan
          </NavLink>
          <NavLink to="/reglages" className={({ isActive }) => `tab${isActive ? " is-on" : ""}`}>
            Réglages
          </NavLink>
        </nav>
        <main className="page">
          <Routes>
            <Route path="/" element={<Hives />} />
            <Route path="/ruches/nouvelle" element={<HiveForm />} />
            <Route path="/ruches/:id" element={<HiveDetail />} />
            <Route path="/ruches/:id/modifier" element={<HiveForm />} />
            <Route path="/ruches/:id/visite" element={<InspectionForm />} />
            <Route path="/visites/:visitId/modifier" element={<InspectionForm />} />
            <Route path="/tableau" element={<Dashboard />} />
            <Route path="/bilan" element={<Season />} />
            <Route path="/reglages" element={<Settings onLogout={() => setAuth("out")} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
