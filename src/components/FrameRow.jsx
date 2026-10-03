// Les cadres d'un corps de ruche, en rang. Un appui fait passer un cadre à l'état suivant.
// La partition isolante occupe la place d'un cadre mais n'en est pas un : elle est dessinée plus fine.

export const FRAME_STATES = ["empty", "drawn", "brood", "honey", "pollen", "partition"];

export const FRAME_LABELS = {
  empty: "Vide",
  drawn: "Bâti",
  brood: "Couvain",
  honey: "Miel",
  pollen: "Pollen",
  partition: "Partition",
};

const FRAME_SHORT = { empty: "", drawn: "B", brood: "C", honey: "M", pollen: "P", partition: "I" };

export function countFrames(frames) {
  const counts = { empty: 0, drawn: 0, brood: 0, honey: 0, pollen: 0, partition: 0 };
  for (const state of frames) if (state in counts) counts[state] += 1;
  return counts;
}

// `changed` : indices des cadres à souligner (comparaison de deux visites).
export default function FrameRow({ frames, onChange, compact = false, changed = [] }) {
  const cycle = (index) => {
    const next = FRAME_STATES[(FRAME_STATES.indexOf(frames[index]) + 1) % FRAME_STATES.length];
    onChange(frames.map((state, i) => (i === index ? next : state)));
  };

  return (
    <div className={`frames${compact ? " frames--compact" : ""}`}>
      {frames.map((state, index) => {
        const label = `Cadre ${index + 1} : ${FRAME_LABELS[state]}${changed.includes(index) ? ", a changé" : ""}`;
        const className = `frame frame--${state}${changed.includes(index) ? " is-changed" : ""}`;
        const content = (
          <>
            <span className="frame-n">{index + 1}</span>
            <span className="frame-s">{FRAME_SHORT[state]}</span>
          </>
        );
        return onChange ? (
          <button
            key={index}
            type="button"
            className={className}
            onClick={() => cycle(index)}
            aria-label={`${label}. Appuyer pour changer.`}
          >
            {content}
          </button>
        ) : (
          <span key={index} className={className} role="img" aria-label={label}>
            {content}
          </span>
        );
      })}
    </div>
  );
}

export function FrameLegend({ frames }) {
  const counts = countFrames(frames);
  // La partition n'apparaît dans la légende que si elle est posée.
  const states = ["brood", "honey", "pollen", "drawn", "empty", "partition"].filter(
    (state) => state !== "partition" || counts.partition > 0,
  );
  return (
    <ul className="legend">
      {states.map((state) => (
        <li key={state}>
          <span className={`swatch frame--${state}`} aria-hidden="true" />
          {FRAME_LABELS[state]} <strong>{counts[state]}</strong>
        </li>
      ))}
    </ul>
  );
}
