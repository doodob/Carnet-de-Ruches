// Photos de visite : réduites dans le navigateur avant l'envoi (≈ 1600 px, plus une vignette),
// pour ménager le forfait mobile au rucher et le stockage.

const PHOTO_SIDE = 1600;
const THUMB_SIDE = 400;

export const photoUrl = (id, thumb = false) => `/api/photos/${id}${thumb ? "?taille=vignette" : ""}`;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`« ${file.name} » n'a pas pu être lue. Essaie une photo JPEG ou PNG.`));
    };
    img.src = url;
  });
}

// Les navigateurs récents appliquent l'orientation EXIF en dessinant l'image : la photo reste droite.
function shrink(img, side, quality) {
  const scale = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Réduction de la photo impossible."))), "image/jpeg", quality),
  );
}

// Retourne { photo, thumb, preview } ; `preview` est une URL locale à libérer avec URL.revokeObjectURL.
export async function preparePhoto(file) {
  const { img, url } = await loadImage(file);
  try {
    const [photo, thumb] = await Promise.all([shrink(img, PHOTO_SIDE, 0.82), shrink(img, THUMB_SIDE, 0.75)]);
    return { photo, thumb, preview: URL.createObjectURL(thumb) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function photoForm({ photo, thumb }) {
  const form = new FormData();
  form.append("photo", photo, "photo.jpg");
  form.append("thumb", thumb, "vignette.jpg");
  return form;
}
