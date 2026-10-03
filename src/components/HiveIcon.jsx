// Une ruche dessinée : toit, hausses empilées, corps, plateau sur pieds.
// Toutes les ruches d'une rangée partagent la même hauteur de dessin (`maxSupers`),
// pour que leurs pieds soient alignés comme au rucher.

import { MARKING_HEX } from "../util.js";

export const MAX_DRAWN_SUPERS = 4;

const W = 100;
const ROOF_H = 20;
const SUPER_H = 15;
const BODY_H = 34;
const STAND_H = 14;
const PAD = 3;

const heightFor = (supers) => PAD * 2 + ROOF_H + supers * SUPER_H + BODY_H + STAND_H;

// Poignée creusée dans le bois.
function Handhold({ y }) {
  return <rect x={W / 2 - 9} y={y - 1.5} width={18} height={3} rx={1.5} className="hive-ink" />;
}

export default function HiveIcon({ supers = 0, maxSupers = supers, queenColor = null }) {
  const drawn = Math.min(Math.max(supers ?? 0, 0), MAX_DRAWN_SUPERS);
  const extra = (supers ?? 0) - drawn;
  const height = heightFor(Math.min(Math.max(maxSupers ?? 0, drawn), MAX_DRAWN_SUPERS));

  // On construit de bas en haut.
  const standTop = height - PAD - STAND_H;
  const bodyTop = standTop - BODY_H;
  const superTops = Array.from({ length: drawn }, (_, i) => bodyTop - (i + 1) * SUPER_H);
  const roofBottom = bodyTop - drawn * SUPER_H;

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="hive-icon" aria-hidden="true" focusable="false">
      {/* Plateau et pieds */}
      <rect x={20} y={standTop + 4} width={7} height={STAND_H - 4} className="hive-stand" />
      <rect x={W - 27} y={standTop + 4} width={7} height={STAND_H - 4} className="hive-stand" />
      <rect x={9} y={standTop} width={W - 18} height={5} rx={1} className="hive-stand" />

      {/* Corps, avec son trou de vol */}
      <rect x={13} y={bodyTop} width={W - 26} height={BODY_H} className="hive-body" />
      <Handhold y={bodyTop + 12} />
      <rect x={W / 2 - 15} y={standTop - 6} width={30} height={4} rx={1} className="hive-ink" />

      {/* Hausses */}
      {superTops.map((top) => (
        <g key={top}>
          <rect x={13} y={top} width={W - 26} height={SUPER_H} className="hive-super" />
          <Handhold y={top + SUPER_H / 2} />
        </g>
      ))}

      {/* Toit à deux pans sur son couvercle */}
      <polygon
        points={`12,${roofBottom - 8} ${W / 2},${roofBottom - ROOF_H + 1} ${W - 12},${roofBottom - 8}`}
        className="hive-roof"
      />
      <rect x={7} y={roofBottom - 9} width={W - 14} height={9} rx={2} className="hive-roof" />

      {extra > 0 && (
        <text x={W - 16} y={roofBottom + SUPER_H / 2 + 4.5} textAnchor="end" className="hive-extra">
          +{extra}
        </text>
      )}

      {queenColor && MARKING_HEX[queenColor] && (
        <circle cx={W - 22} cy={bodyTop + 24} r={6} fill={MARKING_HEX[queenColor]} className="hive-queen" />
      )}
    </svg>
  );
}
