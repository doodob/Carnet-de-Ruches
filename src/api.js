// Petit client pour l'API (/api/*). Le cookie de session est géré par le navigateur.

async function request(method, path, body) {
  // Un FormData (photos) part tel quel : le navigateur fixe lui-même l'en-tête multipart.
  const isForm = body instanceof FormData;
  const res = await fetch(`/api${path}`, {
    method,
    headers: body !== undefined && !isForm ? { "content-type": "application/json" } : undefined,
    body: body === undefined || isForm ? body : JSON.stringify(body),
    credentials: "same-origin",
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // réponse sans corps JSON
  }

  if (!res.ok) {
    if (res.status === 401 && path !== "/login") {
      window.dispatchEvent(new Event("carnet:unauthorized"));
    }
    const error = new Error(data?.error || `Erreur ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return data;
}

export const api = {
  get: (path) => request("GET", path),
  post: (path, body = {}) => request("POST", path, body),
  put: (path, body = {}) => request("PUT", path, body),
  del: (path) => request("DELETE", path),
  upload: (path, form) => request("POST", path, form),
};
