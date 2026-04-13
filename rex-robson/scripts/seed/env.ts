import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function loadEnvFiles(): void {
  const root = resolve(process.cwd());
  for (const name of [".env.local", ".env"]) {
    const path = resolve(root, name);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

export function createServiceSupabase(): SupabaseClient {
  loadEnvFiles();

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  const serviceRole =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ??
    "";

  if (!url || !serviceRole) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and/or a service role key.\n" +
        "Set SUPABASE_SERVICE_ROLE_KEY (recommended) or NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY in .env.local.\n" +
        "Never use NEXT_PUBLIC_ for the service role in real apps — it is exposed to the browser.",
    );
    process.exit(1);
  }

  if (
    serviceRole &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
  ) {
    console.warn(
      "Using NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY. Rename to SUPABASE_SERVICE_ROLE_KEY so the key is not bundled for the client.",
    );
  }

  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
