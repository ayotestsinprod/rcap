/** Page numbers plus ellipses for a compact stepped control (jump to any shown page). */
export function workspaceBrowsePaginationItems(
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

type WorkspaceBrowsePaginationProps = {
  ariaLabel: string;
  safePage: number;
  totalPages: number;
  loading: boolean;
  onPageChange: (page: number) => void;
};

export function WorkspaceBrowsePagination({
  ariaLabel,
  safePage,
  totalPages,
  loading,
  onPageChange,
}: WorkspaceBrowsePaginationProps) {
  return (
    <nav
      className="mt-4 flex shrink-0 flex-col gap-3 border-t border-charcoal/[0.06] pt-4"
      aria-label={ariaLabel}
    >
      <p className="text-xs text-charcoal-light/75">
        Page {safePage} of {totalPages}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          disabled={loading || safePage <= 1}
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          className="rounded-lg border border-charcoal/15 bg-cream px-2.5 py-1.5 text-xs font-medium text-charcoal transition-colors enabled:hover:bg-charcoal/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        {totalPages > 1
          ? workspaceBrowsePaginationItems(safePage, totalPages).map((item, idx) =>
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
                  onClick={() => onPageChange(item)}
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
          onClick={() => onPageChange(safePage + 1)}
          className="rounded-lg border border-charcoal/15 bg-cream px-2.5 py-1.5 text-xs font-medium text-charcoal transition-colors enabled:hover:bg-charcoal/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </nav>
  );
}
