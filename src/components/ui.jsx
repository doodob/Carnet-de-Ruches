import { MARKING_HEX } from "../util.js";

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

// Pour les groupes de boutons (pas de <label> englobant).
export function Group({ label, hint, children }) {
  return (
    <fieldset className="field">
      <legend className="field-label">{label}</legend>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </fieldset>
  );
}

export function Segmented({ options, value, onChange, clearable = false }) {
  return (
    <div className="segmented">
      {options.map((option) => {
        const on = value === option.value;
        return (
          <button
            key={String(option.value)}
            type="button"
            className={`seg${on ? " is-on" : ""}`}
            aria-pressed={on}
            onClick={() => onChange(clearable && on ? null : option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function YesNo({ value, onChange }) {
  return (
    <Segmented
      clearable
      value={value}
      onChange={onChange}
      options={[
        { value: true, label: "Oui" },
        { value: false, label: "Non" },
      ]}
    />
  );
}

export function Chips({ options, value, onChange }) {
  const toggle = (option) =>
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  return (
    <div className="chips">
      {options.map((option) => {
        const on = value.includes(option);
        return (
          <button
            key={option}
            type="button"
            className={`chip${on ? " is-on" : ""}`}
            aria-pressed={on}
            onClick={() => toggle(option)}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export function Stepper({ value, onChange, min = 0, max = 99, label }) {
  const current = value ?? null;
  const dec = () => onChange(current === null ? min : Math.max(min, current - 1));
  const inc = () => onChange(current === null ? min + 1 : Math.min(max, current + 1));
  return (
    <div className="stepper">
      <button type="button" className="step-btn" onClick={dec} aria-label={`Diminuer : ${label}`}>
        −
      </button>
      <output className="step-value" aria-label={label}>
        {current === null ? "–" : current}
      </output>
      <button type="button" className="step-btn" onClick={inc} aria-label={`Augmenter : ${label}`}>
        +
      </button>
    </div>
  );
}

export function QueenDot({ color, size = 18 }) {
  if (!color) return null;
  return (
    <span
      className="queen-dot"
      style={{ width: size, height: size, background: MARKING_HEX[color] ?? "transparent" }}
      title={`Reine marquée ${color}`}
      role="img"
      aria-label={`Reine marquée ${color}`}
    />
  );
}

export function ErrorNote({ message }) {
  if (!message) return null;
  return (
    <p className="error-note" role="alert">
      {message}
    </p>
  );
}

export function Loading() {
  return <p className="muted">Chargement…</p>;
}
