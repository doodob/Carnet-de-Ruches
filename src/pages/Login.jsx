import { useState } from "react";
import { api } from "../api.js";
import { ErrorNote, Field } from "../components/ui.jsx";

export default function Login({ onSuccess }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/login", { password });
      onSuccess();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page page--narrow">
      <h1>Carnet de rucher</h1>
      <p className="muted">Entre ton mot de passe pour ouvrir ton carnet.</p>
      <form onSubmit={submit} className="stack">
        <Field label="Mot de passe">
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
          />
        </Field>
        <ErrorNote message={error} />
        <button className="btn btn--primary" disabled={busy}>
          {busy ? "Connexion…" : "Ouvrir le carnet"}
        </button>
      </form>
    </main>
  );
}
