"use client";

import {
  Briefcase,
  Plus,
  PoundSterling,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import type {
  DashboardMetrics,
  DealStage,
} from "@/lib/data/dashboard-metrics.types";

type DashboardPanelProps = {
  metrics: DashboardMetrics;
  onAddContact?: () => void;
  onOpenSuggestions?: () => void;
};

function formatGbp(value: number): string {
  if (!Number.isFinite(value)) return "£0";
  if (value >= 1_000_000) return `£${(Math.round(value / 100_000) / 10).toLocaleString()}M`;
  if (value >= 1_000) return `£${(Math.round(value / 100) / 10).toLocaleString()}K`;
  return `£${Math.round(value).toLocaleString()}`;
}

function formatCount(value: number): string {
  return value.toLocaleString();
}

type MetricCardProps = {
  label: string;
  value: string;
  subline: string;
  icon: React.ReactNode;
};

function MetricCard({ label, value, subline, icon }: MetricCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-charcoal/[0.08] bg-cream-light/60 p-5 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-charcoal-light/80">
          {label}
        </p>
        <span className="flex size-7 items-center justify-center rounded-full bg-charcoal/[0.06] text-charcoal-light">
          {icon}
        </span>
      </div>
      <p className="font-serif text-4xl tracking-tight text-charcoal">{value}</p>
      <p className="text-xs text-charcoal-light/85">{subline}</p>
    </div>
  );
}

const STAGE_ORDER: DealStage[] = ["prospect", "active", "matching", "closed"];

const STAGE_LABELS: Record<DealStage, string> = {
  prospect: "Prospect",
  active: "Active",
  matching: "Matching",
  closed: "Closed",
};

// Progressively deeper charcoal opacities so the bar reads as a gradient
// from early-stage (lightest) to closed (darkest).
const STAGE_BAR_BG: Record<DealStage, string> = {
  prospect: "bg-charcoal/20",
  active: "bg-charcoal/40",
  matching: "bg-charcoal/65",
  closed: "bg-charcoal/90",
};

const STAGE_DOT_BG: Record<DealStage, string> = {
  prospect: "bg-charcoal/25",
  active: "bg-charcoal/45",
  matching: "bg-charcoal/70",
  closed: "bg-charcoal/95",
};

type StageBreakdownProps = {
  dealsByStage: Record<DealStage, number>;
};

function StageBreakdown({ dealsByStage }: StageBreakdownProps) {
  const total = STAGE_ORDER.reduce((sum, s) => sum + dealsByStage[s], 0);

  return (
    <div className="rounded-xl border border-charcoal/[0.08] bg-cream-light/60 p-5 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-charcoal-light/80">
          Deals by stage
        </p>
        <p className="text-[11px] text-charcoal-light/70">
          {formatCount(total)} total
        </p>
      </div>

      {total === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-charcoal/15 bg-cream-light/40 px-4 py-6 text-center">
          <p className="text-xs text-charcoal-light/80">No deals to show yet.</p>
        </div>
      ) : (
        <>
          <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-charcoal/[0.06]">
            {STAGE_ORDER.map((stage) => {
              const count = dealsByStage[stage];
              if (count === 0) return null;
              const widthPct = (count / total) * 100;
              return (
                <div
                  key={stage}
                  className={`h-full ${STAGE_BAR_BG[stage]}`}
                  style={{ width: `${widthPct}%` }}
                  aria-label={`${STAGE_LABELS[stage]}: ${count}`}
                />
              );
            })}
          </div>

          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STAGE_ORDER.map((stage) => {
              const count = dealsByStage[stage];
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <li
                  key={stage}
                  className="flex items-center gap-2 rounded-lg border border-charcoal/[0.06] bg-cream-light/40 px-3 py-2"
                >
                  <span
                    className={`size-2.5 shrink-0 rounded-full ${STAGE_DOT_BG[stage]}`}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-charcoal-light/80">
                      {STAGE_LABELS[stage]}
                    </p>
                    <p className="text-sm text-charcoal">
                      {formatCount(count)}
                      <span className="ml-1 text-xs text-charcoal-light/70">
                        {pct}%
                      </span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

export function DashboardPanel({
  metrics,
  onAddContact,
  onOpenSuggestions,
}: DashboardPanelProps) {
  const {
    contactCount,
    contactsNew30d,
    openDealCount,
    openPipelineValue,
    avgDealSize,
    dealsByStage,
    matchingCount,
    matchingValue,
    suggestionsPendingCount,
  } = metrics;

  const contactsSubline =
    contactsNew30d > 0
      ? `+${formatCount(contactsNew30d)} in last 30 days`
      : "No new contacts in last 30 days";

  const pipelineSubline =
    avgDealSize != null
      ? `Avg ${formatGbp(avgDealSize)} across ${formatCount(openDealCount)} open deal${openDealCount === 1 ? "" : "s"}`
      : "No open deal sizes recorded";

  const matchingSubline =
    matchingCount > 0
      ? `${formatGbp(matchingValue)} in matching stage`
      : "No deals in matching";

  return (
    <div className="flex flex-col px-4 py-6 sm:px-8">
      <div className="shrink-0">
        <h2 className="font-serif text-xl tracking-tight text-charcoal">
          Dashboard
        </h2>
        <p className="mt-1 text-xs text-charcoal-light/80">
          A quick read on contacts, open deals, and pipeline value.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Contacts"
          value={formatCount(contactCount)}
          subline={contactsSubline}
          icon={<Users className="size-3.5" strokeWidth={1.75} aria-hidden />}
        />
        <MetricCard
          label="Potential Deals"
          value={formatCount(openDealCount)}
          subline="Open pipeline (excludes passed and closed)"
          icon={
            <Briefcase className="size-3.5" strokeWidth={1.75} aria-hidden />
          }
        />
        <MetricCard
          label="Pipeline Value"
          value={formatGbp(openPipelineValue)}
          subline={pipelineSubline}
          icon={
            <PoundSterling
              className="size-3.5"
              strokeWidth={1.75}
              aria-hidden
            />
          }
        />
        <MetricCard
          label="In Matching"
          value={formatCount(matchingCount)}
          subline={matchingSubline}
          icon={<Target className="size-3.5" strokeWidth={1.75} aria-hidden />}
        />
      </div>

      <div className="mt-4">
        <StageBreakdown dealsByStage={dealsByStage} />
      </div>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onAddContact}
          className="inline-flex items-center gap-3 rounded-xl bg-charcoal px-8 py-4 text-base font-semibold uppercase tracking-wide text-cream shadow-sm transition-colors hover:bg-charcoal/90"
        >
          <Plus className="size-5" strokeWidth={2} aria-hidden />
          Add contact
        </button>

        <button
          type="button"
          onClick={onOpenSuggestions}
          className="group inline-flex items-center gap-3 rounded-xl border border-charcoal/[0.08] bg-cream-light/60 px-4 py-3 text-left shadow-[0_1px_0_rgba(0,0,0,0.02)] transition-colors hover:bg-cream-light/90"
          aria-label="Open Rex suggestions"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-charcoal/[0.06] text-charcoal-light">
            <Sparkles className="size-4" strokeWidth={1.75} aria-hidden />
          </span>
          <span className="flex flex-col">
            <span className="text-[11px] font-medium uppercase tracking-wide text-charcoal-light/80">
              Unreviewed suggestions
            </span>
            <span className="text-sm text-charcoal">
              <span className="font-serif text-lg tracking-tight">
                {formatCount(suggestionsPendingCount)}
              </span>
              <span className="ml-1.5 text-xs text-charcoal-light/75">
                awaiting review
              </span>
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
