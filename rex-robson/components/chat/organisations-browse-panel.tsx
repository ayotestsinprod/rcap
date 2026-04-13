"use client";

import { useCallback, useEffect, useState } from "react";
import {
  WORKSPACE_ORGANISATIONS_PAGE_SIZE_DEFAULT,
  type WorkspaceOrganisationPageRow,
} from "@/lib/data/workspace-organisations-page.types";
import { WorkspaceBrowsePagination } from "./workspace-browse-pagination";

function muted(line: string | null | undefined) {
  if (line == null || line === "") return null;
  return (
    <p className="mt-0.5 line-clamp-3 text-xs text-charcoal-light/85">
      {line}
    </p>
  );
}

type ApiOk = { rows: WorkspaceOrganisationPageRow[]; total: number };
type ApiErr = { error?: string; hint?: string };

export function OrganisationsBrowsePanel() {
  const pageSize = WORKSPACE_ORGANISATIONS_PAGE_SIZE_DEFAULT;
  const [queryInput, setQueryInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<WorkspaceOrganisationPageRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(queryInput.trim()), 320);
    return () => window.clearTimeout(t);
  }, [queryInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (debouncedQuery !== "") {
      params.set("q", debouncedQuery);
    }
    try {
      const res = await fetch(`/api/workspace/organisations?${params.toString()}`);
      const data = (await res.json()) as ApiOk & ApiErr;
      if (!res.ok) {
        setRows([]);
        setTotal(0);
        const parts = [data.error, data.hint].filter(
          (x): x is string => typeof x === "string" && x.length > 0,
        );
        setError(parts.length > 0 ? parts.join(" ") : "Could not load organisations.");
        return;
      }
      setRows(data.rows ?? []);
      setTotal(typeof data.total === "number" ? data.total : 0);
    } catch {
      setRows([]);
      setTotal(0);
      setError("Network error while loading organisations.");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedQuery, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  useEffect(() => {
    if (page !== safePage && safePage >= 1) {
      setPage(safePage);
    }
  }, [page, safePage]);

  return (
    <div className="flex flex-col px-4 py-6 sm:px-8">
      <div className="shrink-0">
        <h2 className="font-serif text-xl tracking-tight text-charcoal">
          Organisations
        </h2>
        <p className="mt-1 text-xs text-charcoal-light/80">
          {loading
            ? "Loading…"
            : total === 0
              ? debouncedQuery
                ? "No matches for that search."
                : "No organisations yet."
              : `Showing ${from}–${to} of ${total}`}
        </p>
        <label className="mt-4 block">
          <span className="sr-only">Search organisations</span>
          <input
            type="search"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Deep search: name, type, description…"
            autoComplete="off"
            className="w-full rounded-lg border border-charcoal/15 bg-cream px-3 py-2 text-sm text-charcoal placeholder:text-charcoal-light/50 outline-none ring-charcoal/20 focus:border-charcoal/25 focus:ring-2"
          />
        </label>
      </div>

      {error ? (
        <p className="mt-4 shrink-0 text-sm text-red-700/90" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 rounded-xl border border-charcoal/[0.08] bg-cream-light/40">
        <ul className="divide-y divide-charcoal/[0.06]">
          {loading
            ? Array.from({ length: pageSize }).map((_, i) => (
                <li key={i} className="animate-pulse px-4 py-4">
                  <div className="h-4 w-48 rounded bg-charcoal/10" />
                  <div className="mt-2 h-3 w-32 rounded bg-charcoal/5" />
                  <div className="mt-2 h-10 w-full rounded bg-charcoal/[0.04]" />
                </li>
              ))
            : rows.map((o) => (
                <li key={o.id} className="px-4 py-4">
                  <p className="text-sm font-medium text-charcoal">{o.name}</p>
                  {muted(o.type)}
                  {muted(o.description)}
                </li>
              ))}
        </ul>
      </div>

      <WorkspaceBrowsePagination
        ariaLabel="Organisations pagination"
        safePage={safePage}
        totalPages={totalPages}
        loading={loading}
        onPageChange={setPage}
      />
    </div>
  );
}
