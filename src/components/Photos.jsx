// Photos de visite : vignettes, agrandissement plein écran, et ajout depuis l'appareil photo ou la galerie.

import { useEffect, useRef, useState } from "react";
import { photoUrl } from "../photos.js";

function Lightbox({ photos, index, onIndex, onClose }) {
  const dialog = useRef(null);

  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);

  const go = (step) => onIndex((index + step + photos.length) % photos.length);

  return (
    <dialog
      ref={dialog}
      className="lightbox"
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && dialog.current.close()}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
    >
      <img src={photoUrl(photos[index].id)} alt={`Photo ${index + 1} sur ${photos.length}`} />
      <div className="lightbox-bar">
        {photos.length > 1 && (
          <button type="button" className="btn btn--ghost btn--small" onClick={() => go(-1)}>Précédente</button>
        )}
        <span className="muted">{index + 1} / {photos.length}</span>
        {photos.length > 1 && (
          <button type="button" className="btn btn--ghost btn--small" onClick={() => go(1)}>Suivante</button>
        )}
        <button type="button" className="btn btn--primary btn--small" onClick={() => dialog.current.close()} autoFocus>
          Fermer
        </button>
      </div>
    </dialog>
  );
}

// Photos déjà enregistrées. `onDelete` affiche un bouton de suppression sous chaque vignette.
export function PhotoGallery({ photos, onDelete }) {
  const [open, setOpen] = useState(null);
  if (!photos?.length) return null;
  return (
    <>
      <ul className="photos">
        {photos.map((p, i) => (
          <li key={p.id}>
            <button type="button" className="photo-thumb" onClick={() => setOpen(i)} aria-label={`Agrandir la photo ${i + 1}`}>
              <img src={photoUrl(p.id, true)} alt="" loading="lazy" />
            </button>
            {onDelete && (
              <button type="button" className="link-btn link-btn--danger" onClick={() => onDelete(p)}>Supprimer</button>
            )}
          </li>
        ))}
      </ul>
      {open !== null && <Lightbox photos={photos} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </>
  );
}

// Photos choisies mais pas encore envoyées : elles partent à l'enregistrement de la visite.
export function PhotoPicker({ pending, onAdd, onRemove, disabled }) {
  const input = useRef(null);
  return (
    <div className="photo-picker">
      {pending.length > 0 && (
        <ul className="photos">
          {pending.map((p) => (
            <li key={p.key}>
              <span className="photo-thumb">
                <img src={p.preview} alt="" />
              </span>
              <button type="button" className="link-btn link-btn--danger" onClick={() => onRemove(p)} disabled={disabled}>
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const files = [...e.target.files];
          e.target.value = "";
          if (files.length) onAdd(files);
        }}
      />
      <button type="button" className="btn btn--ghost" onClick={() => input.current.click()} disabled={disabled}>
        Prendre ou ajouter des photos
      </button>
    </div>
  );
}
