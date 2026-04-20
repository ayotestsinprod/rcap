"use client";

import { Check, RefreshCw, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { rexEmptySuggestions } from "@/lib/rex/voice";
import type { WorkspaceSuggestionRow } from "@/lib/data/workspace-lists";

const LAST_RUN_STORAGE_KEY = "rex:suggestions:lastRun";
const THROTTLE_MS = 60_000;

type GenerateMatchesResult = {
  created: number;
  skippedDuplicates: number;
  skippedBelowThreshold: number;
  runMs: number;
};

type SuggestionsPanelProps = {
  rows: WorkspaceSuggestionRow[];
  isEmpty: boolean;
};

function muted(line: string | null | undefined) {
  if (line == null || line === "") return null;
  return (
    <p className="mt-0.5 whitespace-pre-line line-clamp-6 text-xs text-charcoal-light/85">
      {line}
    </p>
  );
}

function stripDedupeTag(body: string | null | undefined): string | null {
  if (!body) return null;
  const trimmed = body
    .split("\n")
    .filter((line, idx) => !(idx === 0 && line.trim().startsWith("rex_match_pair:")))
    .join("\n")
    .trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 0) return "just now";
  if (diff < 60_000) return `${Math.max(1, Math.floor(diff / 1000))}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function resultSummary(r: GenerateMatchesResult): string {
  const parts: string[] = [];
  parts.push(`Added ${r.created} ${r.created === 1 ? "suggestion" : "suggestions"}`);
  const extras: string[] = [];
  if (r.skippedDuplicates > 0) extras.push(`${r.skippedDuplicates} duplicates`);
  if (r.skippedBelowThreshold > 0)
    extras.push(`${r.skippedBelowThreshold} below threshold`);
  if (extras.length > 0) parts.push(`(${extras.join(", ")} skipped)`);
  return parts.join(" ");
}

export function SuggestionsPanel({ rows, isEmpty }: SuggestionsPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastRunAt, setLastRunAt] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<GenerateMatchesResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [pendingActionIds, setPendingActionIds] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LAST_RUN_STORAGE_KEY);
      if (raw) {
        const n = Number.parseInt(raw, 10);
        if (Number.isFinite(n)) setLastRunAt(n);
      }
    } catch {
      // localStorage unavailable; skip persistence
    }
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const throttleRemaining = useMemo(() => {
    if (lastRunAt == null) return 0;
    return Math.max(0, THROTTLE_MS - (Date.now() - lastRunAt));
  }, [lastRunAt]);

  const runGenerate = useCallback(() => {
    if (isPending) return;
    if (throttleRemaining > 0) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/workspace/suggestions/generate-matches", {
          method: "POST",
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `generate_matches_failed (${res.status})`);
        }
        const data = (await res.json()) as GenerateMatchesResult;
        const now = Date.now();
        setLastRunAt(now);
        setLastResult(data);
        try {
          window.localStorage.setItem(LAST_RUN_STORAGE_KEY, String(now));
        } catch {
          // ignore storage errors
        }
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to generate matches");
      }
    });
  }, [isPending, router, throttleRemaining]);

  const updateStatus = useCallback(
    async (id: string, status: "acted" | "dismissed") => {
      if (pendingActionIds.has(id)) return;
      setError(null);
      setPendingActionIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      setHiddenIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      try {
        const res = await fetch(
          `/api/workspace/suggestions/${encodeURIComponent(id)}/status`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          },
        );
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `update_failed (${res.status})`);
        }
        router.refresh();
      } catch (e) {
        setHiddenIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setError(
          e instanceof Error ? e.message : "Failed to update suggestion",
        );
      } finally {
        setPendingActionIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [pendingActionIds, router],
  );

  const visibleRows = useMemo(
    () => rows.filter((r) => !hiddenIds.has(r.id)),
    [rows, hiddenIds],
  );
  const visiblyEmpty = isEmpty || visibleRows.length === 0;

  const buttonDisabled = isPending || throttleRemaining > 0;
  const buttonLabel = isPending
    ? "Generating…"
    : throttleRemaining > 0
      ? `Wait ${Math.ceil(throttleRemaining / 1000)}s`
      : visiblyEmpty
        ? "Generate matches"
        : "Refresh suggestions";

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 py-6 sm:px-8">
      <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl tracking-tight text-charcoal">
            Suggestions
          </h2>
          <p className="mt-1 text-xs text-charcoal-light/80">
            {visiblyEmpty
              ? "No suggestions pending — generate fresh founder <> investor and founder <> lender matches."
              : `${visibleRows.length} row${visibleRows.length === 1 ? "" : "s"} from your workspace`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={runGenerate}
            disabled={buttonDisabled}
            className="inline-flex items-center gap-2 rounded-lg border border-charcoal/[0.08] bg-cream-light/80 px-3 py-1.5 text-xs font-medium text-charcoal shadow-[0_1px_0_rgba(0,0,0,0.02)] transition-colors hover:bg-cream-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={
                "size-3.5 " + (isPending ? "animate-spin" : "")
              }
              strokeWidth={1.75}
              aria-hidden
            />
            {buttonLabel}
          </button>
          {lastRunAt != null ? (
            <p className="text-[11px] text-charcoal-light/70">
              Last run {formatRelative(lastRunAt)}
            </p>
          ) : null}
        </div>
      </div>

      {lastResult ? (
        <div className="mb-3 rounded-lg border border-charcoal/[0.08] bg-cream-light/60 px-3 py-2 text-xs text-charcoal-light">
          {resultSummary(lastResult)}
        </div>
      ) : null}
      {error ? (
        <div className="mb-3 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}

      {visiblyEmpty ? (
        <div className="flex min-h-0 flex-1 flex-col items-start justify-start rounded-xl border border-dashed border-charcoal/15 bg-cream-light/40 p-6">
          <span className="flex size-9 items-center justify-center rounded-full bg-charcoal/[0.06] text-charcoal-light">
            <Sparkles className="size-4" strokeWidth={1.75} aria-hidden />
          </span>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-charcoal">
            {rexEmptySuggestions}
          </p>
          <p className="mt-3 max-w-md text-sm text-charcoal-light">
            Hit <span className="font-medium text-charcoal">Generate matches</span> to scan your contacts for founder <span aria-hidden>&lt;&gt;</span> investor and founder <span aria-hidden>&lt;&gt;</span> lender pairs with overlapping sector, deal type, cheque size, or geography.
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-charcoal/[0.08] bg-cream-light/40">
          <ul className="divide-y divide-charcoal/[0.06]">
            {visibleRows.map((s) => {
              const acting = pendingActionIds.has(s.id);
              return (
                <li
                  key={s.id}
                  className={
                    "flex items-start gap-3 px-4 py-3 " +
                    (acting ? "opacity-60" : "")
                  }
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-charcoal">
                      {s.title?.trim() || "Suggestion"}
                    </p>
                    {muted(stripDedupeTag(s.body))}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateStatus(s.id, "acted")}
                      disabled={acting}
                      aria-label="Accept suggestion"
                      title="Accept"
                      className="inline-flex size-8 items-center justify-center rounded-lg border border-charcoal/[0.08] bg-cream-light/60 text-charcoal transition-colors hover:bg-charcoal hover:text-cream disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Check className="size-4" strokeWidth={2} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStatus(s.id, "dismissed")}
                      disabled={acting}
                      aria-label="Reject suggestion"
                      title="Reject"
                      className="inline-flex size-8 items-center justify-center rounded-lg border border-charcoal/[0.08] bg-cream-light/60 text-charcoal-light transition-colors hover:bg-red-500 hover:text-white hover:border-red-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <X className="size-4" strokeWidth={2} aria-hidden />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
