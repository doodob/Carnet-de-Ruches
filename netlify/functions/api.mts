import { getDatabase } from "@netlify/database";

// ---------------------------------------------------------------------------
// Carnet de rucher : API unique.
// Toutes les routes passent par /api/* (voir netlify.toml).
// ---------------------------------------------------------------------------

type Db = ReturnType<typeof getDatabase>;
type Body = Record<string, any>;
type Handler = (ctx: { req: Request; params: Record<string, string>; db: Db }) => Promise<Response>;
type Route = [method: string, pattern: string, handler: Handler];

const COOKIE = "carnet_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30; // 30 jours
const FRAME_STATES = ["empty", "drawn", "brood", "honey", "pollen"];
const HIVE_STATUSES = ["active", "dead", "merged", "sold"];

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// ----- Réponses -------------------------------------------------------------

function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

const fail = (status: number, message: string) => json({ error: message }, status);

// ----- Authentification (mot de passe unique + cookie signé) ----------------

const encoder = new TextEncoder();

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

async function isAuthenticated(req: Request, secret: string): Promise<boolean> {
  const token = readCookie(req, COOKIE);
  if (!token) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature) return false;
  if (Number(expires) < Date.now() / 1000) return false;
  return safeEqual(await hmac(secret, expires), signature);
}

function sessionCookie(value: string, maxAge: number, secure: boolean): string {
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

function isSecure(req: Request): boolean {
  return new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
}

// ----- Lecture et validation des valeurs ------------------------------------

async function readBody(req: Request): Promise<Body> {
  try {
    const data = await req.json();
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function text(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(typeof v === "string" ? v.replace(",", ".") : v);
  return Number.isFinite(n) ? n : null;
}

function int(v: unknown): number | null {
  const n = num(v);
  return n === null ? null : Math.trunc(n);
}

function bool(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}

function requireId(value: string | undefined, what: string): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(404, `${what} introuvable.`);
  return id;
}

// ----- Transaction ----------------------------------------------------------

async function tx<T>(db: Db, fn: (query: (sql: string, values?: unknown[]) => Promise<any[]>) => Promise<T>): Promise<T> {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(async (sql, values) => (await client.query(sql, values)).rows);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ----- Parseurs par ressource -----------------------------------------------

function parseModel(b: Body) {
  const name = text(b.name);
  const body_frames = int(b.body_frames);
  const super_frames = int(b.super_frames);
  if (!name) throw new HttpError(400, "Le nom du modèle est obligatoire.");
  if (body_frames === null || body_frames < 1) throw new HttpError(400, "Le nombre de cadres du corps doit être au moins 1.");
  if (super_frames === null || super_frames < 0) throw new HttpError(400, "Le nombre de cadres de hausse doit être 0 ou plus.");
  return { name, body_frames, super_frames };
}

function parseApiary(b: Body) {
  const name = text(b.name);
  if (!name) throw new HttpError(400, "Le nom du rucher est obligatoire.");
  const latitude = num(b.latitude);
  const longitude = num(b.longitude);
  if ((latitude === null) !== (longitude === null)) {
    throw new HttpError(400, "Renseigne la latitude et la longitude ensemble, ou aucune des deux.");
  }
  if (latitude !== null && (latitude < -90 || latitude > 90)) {
    throw new HttpError(400, "La latitude doit être comprise entre -90 et 90.");
  }
  if (longitude !== null && (longitude < -180 || longitude > 180)) {
    throw new HttpError(400, "La longitude doit être comprise entre -180 et 180.");
  }
  return {
    name,
    location: text(b.location),
    latitude,
    longitude,
    altitude_m: int(b.altitude_m),
    notes: text(b.notes),
  };
}

function parseHive(b: Body) {
  const name = text(b.name);
  const model_id = int(b.model_id);
  if (!name) throw new HttpError(400, "Le nom de la ruche est obligatoire.");
  if (model_id === null) throw new HttpError(400, "Choisis un modèle de ruche.");
  const status = text(b.status) ?? "active";
  if (!HIVE_STATUSES.includes(status)) throw new HttpError(400, "Statut de ruche inconnu.");
  return {
    name,
    model_id,
    apiary_id: int(b.apiary_id),
    installed_on: text(b.installed_on),
    origin: text(b.origin),
    status,
    notes: text(b.notes),
  };
}

function parseQueen(b: Body) {
  const queen = {
    birth_year: int(b.birth_year),
    origin: text(b.origin),
    strain: text(b.strain),
    marking_color: text(b.marking_color),
    introduced_on: text(b.introduced_on),
  };
  const empty = Object.values(queen).every((v) => v === null);
  return empty ? null : queen;
}

function parseInspection(b: Body) {
  let frame_layout: string[] | null = null;
  if (Array.isArray(b.frame_layout)) {
    if (b.frame_layout.length > 30 || !b.frame_layout.every((s: unknown) => typeof s === "string" && FRAME_STATES.includes(s))) {
      throw new HttpError(400, "Le plan des cadres est invalide.");
    }
    frame_layout = b.frame_layout;
  }
  const count = (state: string) => frame_layout?.filter((s) => s === state).length ?? null;

  const temper = int(b.temper);
  if (temper !== null && (temper < 1 || temper > 5)) throw new HttpError(400, "Le comportement doit être noté de 1 à 5.");

  const actions = Array.isArray(b.actions)
    ? b.actions.filter((a: unknown) => typeof a === "string" && a.trim() !== "").slice(0, 20)
    : [];

  let inspected_at: string | null = null;
  if (typeof b.inspected_at === "string" && b.inspected_at !== "") {
    const date = new Date(b.inspected_at);
    if (Number.isNaN(date.getTime())) throw new HttpError(400, "La date de la visite est invalide.");
    inspected_at = date.toISOString();
  }

  return {
    inspected_at,
    temperature_c: num(b.temperature_c),
    wind: text(b.wind),
    sky: text(b.sky),
    queen_seen: bool(b.queen_seen),
    eggs_seen: bool(b.eggs_seen),
    queen_cells: bool(b.queen_cells),
    // Quand le plan des cadres est fourni, les totaux en sont déduits.
    brood_frames: frame_layout ? count("brood") : int(b.brood_frames),
    honey_frames: frame_layout ? count("honey") : int(b.honey_frames),
    pollen_frames: frame_layout ? count("pollen") : int(b.pollen_frames),
    bee_frames: int(b.bee_frames),
    supers_count: int(b.supers_count),
    temper,
    actions: JSON.stringify(actions),
    frame_layout: frame_layout ? JSON.stringify(frame_layout) : null,
    notes: text(b.notes),
  };
}

// ----- Routes ---------------------------------------------------------------

function buildRoutes(): Route[] {
  return [
    // Modèles de ruche
    ["GET", "/models", async ({ db }) => json(await db.sql`SELECT id, name, body_frames, super_frames FROM hive_models ORDER BY name`)],
    [
      "POST",
      "/models",
      async ({ req, db }) => {
        const m = parseModel(await readBody(req));
        const [row] = await db.sql`
          INSERT INTO hive_models (name, body_frames, super_frames)
          VALUES (${m.name}, ${m.body_frames}, ${m.super_frames})
          RETURNING id, name, body_frames, super_frames`;
        return json(row, 201);
      },
    ],
    [
      "PUT",
      "/models/:id",
      async ({ req, params, db }) => {
        const id = requireId(params.id, "Modèle");
        const m = parseModel(await readBody(req));
        const [row] = await db.sql`
          UPDATE hive_models SET name = ${m.name}, body_frames = ${m.body_frames}, super_frames = ${m.super_frames}
          WHERE id = ${id}
          RETURNING id, name, body_frames, super_frames`;
        if (!row) throw new HttpError(404, "Modèle introuvable.");
        return json(row);
      },
    ],
    [
      "DELETE",
      "/models/:id",
      async ({ params, db }) => {
        const id = requireId(params.id, "Modèle");
        await db.sql`DELETE FROM hive_models WHERE id = ${id}`;
        return json({ ok: true });
      },
    ],

    // Ruchers
    [
      "GET",
      "/apiaries",
      async ({ db }) =>
        json(await db.sql`SELECT id, name, location, latitude, longitude, altitude_m, notes FROM apiaries ORDER BY name`),
    ],
    [
      "POST",
      "/apiaries",
      async ({ req, db }) => {
        const a = parseApiary(await readBody(req));
        const [row] = await db.sql`
          INSERT INTO apiaries (name, location, latitude, longitude, altitude_m, notes)
          VALUES (${a.name}, ${a.location}, ${a.latitude}, ${a.longitude}, ${a.altitude_m}, ${a.notes})
          RETURNING id, name, location, latitude, longitude, altitude_m, notes`;
        return json(row, 201);
      },
    ],
    [
      "PUT",
      "/apiaries/:id",
      async ({ req, params, db }) => {
        const id = requireId(params.id, "Rucher");
        const a = parseApiary(await readBody(req));
        const [row] = await db.sql`
          UPDATE apiaries
          SET name = ${a.name}, location = ${a.location}, latitude = ${a.latitude}, longitude = ${a.longitude},
              altitude_m = ${a.altitude_m}, notes = ${a.notes}
          WHERE id = ${id}
          RETURNING id, name, location, latitude, longitude, altitude_m, notes`;
        if (!row) throw new HttpError(404, "Rucher introuvable.");
        return json(row);
      },
    ],
    [
      "DELETE",
      "/apiaries/:id",
      async ({ params, db }) => {
        const id = requireId(params.id, "Rucher");
        await db.sql`DELETE FROM apiaries WHERE id = ${id}`;
        return json({ ok: true });
      },
    ],

    // Ruches
    [
      "GET",
      "/hives",
      async ({ db }) =>
        json(await db.sql`
          SELECT h.id, h.name, h.status, h.model_id, h.apiary_id,
                 m.name AS model_name, m.body_frames, m.super_frames,
                 a.name AS apiary_name,
                 (SELECT max(i.inspected_at) FROM inspections i WHERE i.hive_id = h.id) AS last_inspection,
                 (SELECT row_to_json(q) FROM (
                    SELECT birth_year, marking_color, strain FROM queens
                    WHERE hive_id = h.id AND replaced_on IS NULL
                    ORDER BY id DESC LIMIT 1
                  ) q) AS queen
          FROM hives h
          JOIN hive_models m ON m.id = h.model_id
          LEFT JOIN apiaries a ON a.id = h.apiary_id
          ORDER BY (h.status = 'active') DESC, h.name`),
    ],
    [
      "POST",
      "/hives",
      async ({ req, db }) => {
        const b = await readBody(req);
        const h = parseHive(b);
        const q = b.queen && typeof b.queen === "object" ? parseQueen(b.queen) : null;
        const id = await tx(db, async (query) => {
          const [row] = await query(
            `INSERT INTO hives (name, model_id, apiary_id, installed_on, origin, status, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [h.name, h.model_id, h.apiary_id, h.installed_on, h.origin, h.status, h.notes],
          );
          if (q) {
            await query(
              `INSERT INTO queens (hive_id, birth_year, origin, strain, marking_color, introduced_on)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [row.id, q.birth_year, q.origin, q.strain, q.marking_color, q.introduced_on],
            );
          }
          return row.id as number;
        });
        return json({ id }, 201);
      },
    ],
    [
      "GET",
      "/hives/:id",
      async ({ params, db }) => {
        const id = requireId(params.id, "Ruche");
        const [hive] = await db.sql`
          SELECT h.id, h.name, h.status, h.model_id, h.apiary_id, h.origin, h.notes,
                 h.installed_on::text AS installed_on,
                 m.name AS model_name, m.body_frames, m.super_frames,
                 a.name AS apiary_name, a.latitude, a.longitude
          FROM hives h
          JOIN hive_models m ON m.id = h.model_id
          LEFT JOIN apiaries a ON a.id = h.apiary_id
          WHERE h.id = ${id}`;
        if (!hive) throw new HttpError(404, "Ruche introuvable.");
        const queens = await db.sql`
          SELECT id, birth_year, origin, strain, marking_color,
                 introduced_on::text AS introduced_on, replaced_on::text AS replaced_on
          FROM queens
          WHERE hive_id = ${id}
          ORDER BY (replaced_on IS NULL) DESC, introduced_on DESC NULLS LAST, id DESC`;
        return json({ hive, queens });
      },
    ],
    [
      "PUT",
      "/hives/:id",
      async ({ req, params, db }) => {
        const id = requireId(params.id, "Ruche");
        const h = parseHive(await readBody(req));
        const [row] = await db.sql`
          UPDATE hives
          SET name = ${h.name}, model_id = ${h.model_id}, apiary_id = ${h.apiary_id},
              installed_on = ${h.installed_on}, origin = ${h.origin}, status = ${h.status}, notes = ${h.notes}
          WHERE id = ${id}
          RETURNING id`;
        if (!row) throw new HttpError(404, "Ruche introuvable.");
        return json({ id: row.id });
      },
    ],
    [
      "DELETE",
      "/hives/:id",
      async ({ params, db }) => {
        const id = requireId(params.id, "Ruche");
        await db.sql`DELETE FROM hives WHERE id = ${id}`;
        return json({ ok: true });
      },
    ],

    // Reines : une nouvelle reine remplace la reine en place.
    [
      "POST",
      "/hives/:id/queens",
      async ({ req, params, db }) => {
        const id = requireId(params.id, "Ruche");
        const q = parseQueen(await readBody(req));
        if (!q) throw new HttpError(400, "Renseigne au moins une information sur la reine.");
        await tx(db, async (query) => {
          await query(
            `UPDATE queens SET replaced_on = COALESCE($2::date, CURRENT_DATE)
             WHERE hive_id = $1 AND replaced_on IS NULL`,
            [id, q.introduced_on],
          );
          await query(
            `INSERT INTO queens (hive_id, birth_year, origin, strain, marking_color, introduced_on)
             VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE))`,
            [id, q.birth_year, q.origin, q.strain, q.marking_color, q.introduced_on],
          );
        });
        return json({ ok: true }, 201);
      },
    ],

    // Visites
    [
      "GET",
      "/hives/:id/inspections",
      async ({ params, db }) => {
        const id = requireId(params.id, "Ruche");
        return json(await db.sql`
          SELECT id, hive_id, inspected_at, temperature_c, wind, sky, queen_seen, eggs_seen, queen_cells,
                 brood_frames, bee_frames, honey_frames, pollen_frames, supers_count, temper,
                 actions, frame_layout, notes
          FROM inspections
          WHERE hive_id = ${id}
          ORDER BY inspected_at DESC
          LIMIT 100`);
      },
    ],
    [
      "POST",
      "/hives/:id/inspections",
      async ({ req, params, db }) => {
        const id = requireId(params.id, "Ruche");
        const i = parseInspection(await readBody(req));
        const [row] = await db.sql`
          INSERT INTO inspections (
            hive_id, inspected_at, temperature_c, wind, sky, queen_seen, eggs_seen, queen_cells,
            brood_frames, bee_frames, honey_frames, pollen_frames, supers_count, temper,
            actions, frame_layout, notes
          ) VALUES (
            ${id}, COALESCE(${i.inspected_at}::timestamptz, now()), ${i.temperature_c}, ${i.wind}, ${i.sky},
            ${i.queen_seen}, ${i.eggs_seen}, ${i.queen_cells},
            ${i.brood_frames}, ${i.bee_frames}, ${i.honey_frames}, ${i.pollen_frames}, ${i.supers_count}, ${i.temper},
            ${i.actions}::jsonb, ${i.frame_layout}::jsonb, ${i.notes}
          )
          RETURNING id`;
        return json({ id: row.id }, 201);
      },
    ],
    [
      "DELETE",
      "/inspections/:id",
      async ({ params, db }) => {
        const id = requireId(params.id, "Visite");
        await db.sql`DELETE FROM inspections WHERE id = ${id}`;
        return json({ ok: true });
      },
    ],
  ];
}

function compile(pattern: string) {
  const names: string[] = [];
  const source = pattern.replace(/:([a-z]+)/g, (_match, name: string) => {
    names.push(name);
    return "([^/]+)";
  });
  return { regex: new RegExp(`^${source}/?$`), names };
}

// ----- Point d'entrée -------------------------------------------------------

export default async (req: Request) => {
  const url = new URL(req.url);
  // Fonctionne que l'URL soit /api/... ou /.netlify/functions/api/...
  const path = url.pathname.replace(/^.*?\/api(?=\/|$)/, "") || "/";
  const method = req.method.toUpperCase();

  const password = Netlify.env.get("APP_PASSWORD");
  const secret = Netlify.env.get("SESSION_SECRET");
  if (!password || !secret) {
    return fail(500, "Les variables APP_PASSWORD et SESSION_SECRET doivent être définies.");
  }

  try {
    if (method === "POST" && path === "/login") {
      const body = await readBody(req);
      const given = typeof body.password === "string" ? body.password : "";
      const ok = safeEqual(await hmac(secret, given), await hmac(secret, password));
      if (!ok) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        return fail(401, "Mot de passe incorrect.");
      }
      const expires = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
      const token = `${expires}.${await hmac(secret, expires)}`;
      return json({ ok: true }, 200, { "set-cookie": sessionCookie(token, SESSION_SECONDS, isSecure(req)) });
    }

    if (method === "POST" && path === "/logout") {
      return json({ ok: true }, 200, { "set-cookie": sessionCookie("", 0, isSecure(req)) });
    }

    if (method === "GET" && path === "/me") {
      return json({ authenticated: await isAuthenticated(req, secret) });
    }

    if (!(await isAuthenticated(req, secret))) return fail(401, "Connexion requise.");

    const db = getDatabase();
    for (const [routeMethod, pattern, handler] of buildRoutes()) {
      if (routeMethod !== method) continue;
      const { regex, names } = compile(pattern);
      const match = regex.exec(path);
      if (!match) continue;
      const params: Record<string, string> = {};
      names.forEach((name, index) => {
        params[name] = decodeURIComponent(match[index + 1]);
      });
      return await handler({ req, params, db });
    }
    return fail(404, "Route inconnue.");
  } catch (error: any) {
    if (error instanceof HttpError) return fail(error.status, error.message);
    const code: string | undefined = error?.code;
    if (code === "23505") return fail(409, "Cet élément existe déjà.");
    if (code === "23503") return fail(409, "Cet élément est encore utilisé ailleurs et ne peut pas être supprimé.");
    if (typeof code === "string" && code.startsWith("22")) return fail(400, "Une des valeurs saisies est invalide.");
    console.error(error);
    return fail(500, "Erreur du serveur. Réessaie dans un instant.");
  }
};
