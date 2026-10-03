// Développement d'une ruche au fil des visites : cadres de couvain, de miel et couverts d'abeilles.
// Un seul axe (des cadres), une ligne par série, réticule et info-bulle au survol, tableau des valeurs.

import { useEffect, useRef, useState } from "react";

const SERIES = [
  { key: "brood_frames", label: "Couvain", className: "series-brood" },
  { key: "honey_frames", label: "Miel", className: "series-honey" },
  { key: "bee_frames", label: "Abeilles", className: "series-bees" },
];

const HEIGHT = 220;
const M = { top: 12, right: 16, bottom: 28, left: 30 };

const shortDate = (date) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(date);
const longDate = (date) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(date);

function useWidth(ref) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

// Une ligne interrompue là où la valeur manque.
function linePath(points) {
  let d = "";
  let pen = false;
  for (const p of points) {
    if (p.y == null) {
      pen = false;
      continue;
    }
    d += `${pen ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    pen = true;
  }
  return d;
}

// Les visites qui ont au moins une valeur, de la plus ancienne à la plus récente.
export function chartVisits(inspections) {
  return inspections
    .filter((v) => SERIES.some((s) => v[s.key] != null))
    .map((v) => ({ ...v, date: new Date(v.inspected_at) }))
    .sort((a, b) => a.date - b.date);
}

export default function DevelopmentChart({ inspections, bodyFrames }) {
  const box = useRef(null);
  const width = useWidth(box);
  const [hover, setHover] = useState(null);
  const visits = chartVisits(inspections);

  const maxValue = Math.max(bodyFrames, ...visits.flatMap((v) => SERIES.map((s) => v[s.key] ?? 0)));
  const plotW = Math.max(0, width - M.left - M.right);
  const plotH = HEIGHT - M.top - M.bottom;
  const t0 = visits[0]?.date.getTime() ?? 0;
  const t1 = visits[visits.length - 1]?.date.getTime() ?? 1;
  const x = (date) => M.left + (t1 === t0 ? plotW / 2 : ((date.getTime() - t0) / (t1 - t0)) * plotW);
  const y = (value) => M.top + plotH - (value / maxValue) * plotH;

  const ticks = [0, Math.round(maxValue / 2), maxValue].filter((v, i, all) => all.indexOf(v) === i);
  const xLabels = visits.length > 2 ? [visits[0], visits[visits.length - 1]] : visits;

  const onMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    let best = 0;
    visits.forEach((v, i) => {
      if (Math.abs(x(v.date) - px) < Math.abs(x(visits[best].date) - px)) best = i;
    });
    setHover(best);
  };

  const hovered = hover != null ? visits[hover] : null;
  // L'info-bulle se place du côté libre du réticule, pour ne pas cacher la suite des courbes.
  const tipStyle = !hovered
    ? {}
    : x(hovered.date) > width / 2
      ? { right: width - x(hovered.date) + 12 }
      : { left: x(hovered.date) + 12 };

  return (
    <figure className="chart">
      <ul className="chart-legend">
        {SERIES.map((s) => (
          <li key={s.key}>
            <span className={`line-key ${s.className}`} aria-hidden="true" />
            {s.label}
          </li>
        ))}
      </ul>

      <div className="chart-box" ref={box}>
        {width > 0 && (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label={`Cadres de couvain, de miel et d'abeilles sur ${visits.length} visites. Les valeurs sont dans le tableau sous le graphique.`}
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} className="chart-grid" />
                <text x={M.left - 8} y={y(t) + 4} textAnchor="end" className="chart-tick">{t}</text>
              </g>
            ))}
            {xLabels.map((v, i) => (
              <text
                key={v.id}
                x={x(v.date)}
                y={HEIGHT - 8}
                textAnchor={xLabels.length === 1 ? "middle" : i === 0 ? "start" : "end"}
                className="chart-tick"
              >
                {shortDate(v.date)}
              </text>
            ))}

            {hovered && (
              <line x1={x(hovered.date)} x2={x(hovered.date)} y1={M.top} y2={M.top + plotH} className="chart-crosshair" />
            )}

            {SERIES.map((s) => (
              <g key={s.key} className={s.className}>
                <path
                  d={linePath(visits.map((v) => ({ x: x(v.date), y: v[s.key] == null ? null : y(v[s.key]) })))}
                  className="chart-line"
                />
                {visits.map((v) =>
                  v[s.key] == null ? null : (
                    <circle
                      key={v.id}
                      cx={x(v.date)}
                      cy={y(v[s.key])}
                      r={hovered === v ? 5.5 : 4}
                      className="chart-dot"
                    />
                  ),
                )}
              </g>
            ))}
          </svg>
        )}

        {hovered && (
          <div className="chart-tip" style={tipStyle} role="status">
            <div className="chart-tip-date">{longDate(hovered.date)}</div>
            {SERIES.map((s) => (
              <div key={s.key} className="chart-tip-row">
                <span className={`line-key ${s.className}`} aria-hidden="true" />
                <strong>{hovered[s.key] ?? "–"}</strong>
                <span className="muted">{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <details className="chart-table">
        <summary>Voir les valeurs</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Visite</th>
              {SERIES.map((s) => <th key={s.key} scope="col">{s.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {[...visits].reverse().map((v) => (
              <tr key={v.id}>
                <th scope="row">{longDate(v.date)}</th>
                {SERIES.map((s) => <td key={s.key}>{v[s.key] ?? "–"}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
