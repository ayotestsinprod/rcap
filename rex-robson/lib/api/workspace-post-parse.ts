const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(id: string): boolean {
  return UUID_RE.test(id);
}

export function parseRequiredString(
  body: Record<string, unknown>,
  key: string,
  maxLen: number,
): { ok: true; value: string } | { ok: false; error: string } {
  const v = body[key];
  if (typeof v !== "string") {
    return { ok: false, error: `${key} must be a string` };
  }
  const t = v.trim();
  if (t.length === 0) {
    return { ok: false, error: `${key} is required` };
  }
  if (t.length > maxLen) {
    return { ok: false, error: `${key} must be at most ${maxLen} characters` };
  }
  return { ok: true, value: t };
}

export function parseOptionalString(
  body: Record<string, unknown>,
  key: string,
  maxLen: number,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const v = body[key];
  if (v == null || v === "") {
    return { ok: true, value: null };
  }
  if (typeof v !== "string") {
    return { ok: false, error: `${key} must be a string` };
  }
  const t = v.trim();
  if (t.length === 0) {
    return { ok: true, value: null };
  }
  const clipped = t.length > maxLen ? t.slice(0, maxLen) : t;
  return { ok: true, value: clipped };
}

export function parseOptionalUuid(
  body: Record<string, unknown>,
  key: string,
): { ok: true; value: string | null } | { ok: false; error: string } {
  const v = body[key];
  if (v == null || v === "") {
    return { ok: true, value: null };
  }
  if (typeof v !== "string") {
    return { ok: false, error: `${key} must be a string UUID` };
  }
  const t = v.trim();
  if (t === "") {
    return { ok: true, value: null };
  }
  if (!UUID_RE.test(t)) {
    return { ok: false, error: `${key} must be a valid UUID` };
  }
  return { ok: true, value: t };
}

export function parseOptionalNumber(
  body: Record<string, unknown>,
  key: string,
): { ok: true; value: number | null } | { ok: false; error: string } {
  const v = body[key];
  if (v == null || v === "") {
    return { ok: true, value: null };
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    return { ok: true, value: v };
  }
  if (typeof v === "string") {
    const t = v.trim();
    if (t === "") return { ok: true, value: null };
    const n = Number.parseFloat(t);
    if (!Number.isFinite(n)) {
      return { ok: false, error: `${key} must be a number` };
    }
    return { ok: true, value: n };
  }
  return { ok: false, error: `${key} must be a number` };
}

export async function readJsonObject(req: Request): Promise<
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; error: string }
> {
  try {
    const raw = await req.json();
    if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
      return { ok: false, error: "JSON body must be an object" };
    }
    return { ok: true, body: raw as Record<string, unknown> };
  } catch {
    return { ok: false, error: "Invalid JSON body" };
  }
}
