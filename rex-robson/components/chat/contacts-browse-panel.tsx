"use client";

import { useCallback, useEffect, useState } from "react";
import {
  WORKSPACE_CONTACTS_PAGE_SIZE_DEFAULT,
  type WorkspaceContactPageRow,
} from "@/lib/data/workspace-contacts.types";

function muted(line: string | null | undefined) {
  if (line == null || line === "") return null;
  return (
    <p className="mt-0.5 line-clamp-2 text-xs text-charcoal-light/85">
      {line}
    </p>
  );
}

type ApiOk = { rows: WorkspaceContactPageRow[]; total: number };
type ApiErr = { error?: string; hint?: string };

/** Page numbers plus ellipses for a compact stepped control (jump to any shown page). */
function contactPaginationItems(
  current: number,
  total: number,
): Array<number | "ellipsis"> {
  if (total <= 1) {
    return [1];
  }
  if (total <= 9) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const sibling = 1;
  const items: Array<number | "ellipsis"> = [];
  items.push(1);
  const left = Math.max(2, current - sibling);
  const right = Math.min(total - 1, current + sibling);
  if (left > 2) {
    items.push("ellipsis");
  }
  for (let p = left; p <= right; p += 1) {
    items.push(p);
  }
  if (right < total - 1) {
    items.push("ellipsis");
  }
  items.push(total);
  return items;
}

export function ContactsBrowsePanel() {
  const pageSize = WORKSPACE_CONTACTS_PAGE_SIZE_DEFAULT;
  const [queryInput, setQueryInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<WorkspaceContactPageRow[]>([]);
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
      const res = await fetch(`/api/workspace/contacts?${params.toString()}`);
      const data = (await res.json()) as ApiOk & ApiErr;
      if (!res.ok) {
        setRows([]);
        setTotal(0);
        const parts = [data.error, data.hint].filter(
          (x): x is string => typeof x === "string" && x.length > 0,
        );
        setError(parts.length > 0 ? parts.join(" ") : "Could not load contacts.");
        return;
      }
      setRows(data.rows ?? []);
      setTotal(typeof data.total === "number" ? data.total : 0);
    } catch {
      setRows([]);
      setTotal(0);
      setError("Network error while loading contacts.");
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
          Contacts
        </h2>
        <p className="mt-1 text-xs text-charcoal-light/80">
          {loading
            ? "Loading…"
            : total === 0
              ? debouncedQuery
                ? "No matches for that search."
                : "No contacts yet."
              : `Showing ${from}–${to} of ${total}`}
        </p>
        <label className="mt-4 block">
          <span className="sr-only">Search contacts</span>
          <input
            type="search"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Search by name, company, role, notes…"
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
                <li key={i} className="animate-pulse px-4 py-3">
                  <div className="h-4 w-40 rounded bg-charcoal/10" />
                  <div className="mt-2 h-3 w-64 rounded bg-charcoal/5" />
                </li>
              ))
            : rows.map((c) => {
                const sub = [c.role, c.organisation_name, c.geography]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <li key={c.id} className="px-4 py-3">
                    <p className="text-sm font-medium text-charcoal">{c.name}</p>
                    {muted(sub || null)}
                  </li>
                );
              })}
        </ul>
      </div>

      <nav
        className="mt-4 flex shrink-0 flex-col gap-3 border-t border-charcoal/[0.06] pt-4"
        aria-label="Contacts pagination"
      >
        <p className="text-xs text-charcoal-light/75">
          Page {safePage} of {totalPages}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={loading || safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-charcoal/15 bg-cream px-2.5 py-1.5 text-xs font-medium text-charcoal transition-colors enabled:hover:bg-charcoal/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          {totalPages > 1
            ? contactPaginationItems(safePage, totalPages).map((item, idx) =>
                item === "ellipsis" ? (
                  <span
                    key={`e-${idx}`}
                    className="px-1 text-xs text-charcoal-light/60"
                    aria-hidden
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    disabled={loading}
                    aria-label={`Page ${item}`}
                    aria-current={item === safePage ? "page" : undefined}
                    onClick={() => setPage(item)}
                    className={[
                      "min-w-8 rounded-lg px-2 py-1.5 text-center text-xs font-medium transition-colors disabled:opacity-40",
                      item === safePage
                        ? "bg-charcoal text-cream"
                        : "border border-charcoal/15 bg-cream text-charcoal enabled:hover:bg-charcoal/[0.04]",
                    ].join(" ")}
                  >
                    {item}
                  </button>
                ),
              )
            : null}
          <button
            type="button"
            disabled={loading || safePage >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-charcoal/15 bg-cream px-2.5 py-1.5 text-xs font-medium text-charcoal transition-colors enabled:hover:bg-charcoal/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </nav>
    </div>
  );
}
