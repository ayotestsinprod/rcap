"use client";

import type { ReactNode } from "react";
import type { WorkspaceSuggestionRow } from "@/lib/data/workspace-lists";

function PanelChrome({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 py-6 sm:px-8">
      <div className="mb-4 shrink-0">
        <h2 className="font-serif text-xl tracking-tight text-charcoal">
          {title}
        </h2>
        <p className="mt-1 text-xs text-charcoal-light/80">
          {count} row{count === 1 ? "" : "s"} from your workspace
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-charcoal/[0.08] bg-cream-light/40">
        <ul className="divide-y divide-charcoal/[0.06]">{children}</ul>
      </div>
    </div>
  );
}

function muted(line: string | null | undefined) {
  if (line == null || line === "") return null;
  return (
    <p className="mt-0.5 line-clamp-2 text-xs text-charcoal-light/85">
      {line}
    </p>
  );
}

export function SuggestionsDataPanel({
  rows,
}: {
  rows: WorkspaceSuggestionRow[];
}) {
  return (
    <PanelChrome title="Suggestions" count={rows.length}>
      {rows.map((s) => (
        <li key={s.id} className="px-4 py-3">
          <p className="text-sm font-medium text-charcoal">
            {s.title?.trim() || "Suggestion"}
          </p>
          {muted(s.body)}
        </li>
      ))}
    </PanelChrome>
  );
}
