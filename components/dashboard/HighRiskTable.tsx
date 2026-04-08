"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ChurnSignal, RiskLevel, Plan } from "@/lib/types";
import { cn } from "@/lib/utils";

interface HighRiskTableProps {
  signals: ChurnSignal[];
}

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const PLAN_COLORS: Record<Plan, string> = {
  Free: "text-ink-muted",
  Pyme: "text-ink-dim",
  Plus: "text-brand",
  Pro: "text-brand-dim",
};

const RISK_LABELS: Record<RiskLevel, string> = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
};

const RISK_DOT: Record<RiskLevel, string> = {
  low: "bg-ok",
  medium: "bg-warning",
  high: "bg-danger",
};

type SortKey =
  | "user_id"
  | "country"
  | "plan"
  | "mrr_usd"
  | "base_churn_score"
  | "local_risk_level";

export function HighRiskTable({ signals }: HighRiskTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("base_churn_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const sorted = [...signals]
    .filter((s) => s.local_risk_level !== "low")
    .sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc"
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const toggle = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  };

  const th = (key: SortKey, label: string) => (
    <th
      onClick={() => toggle(key)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle(key);
        }
      }}
      role="columnheader"
      aria-sort={
        sortKey === key
          ? sortDir === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
      tabIndex={0}
      className="px-3 py-2 text-left text-xs font-mono uppercase tracking-wider text-ink-muted cursor-pointer select-none hover:text-ink transition-colors whitespace-nowrap"
    >
      {label} {sortKey === key ? (sortDir === "asc" ? "↑" : "↓") : ""}
    </th>
  );

  return (
    <div>
      <div className="overflow-x-auto">
        <table
          className="w-full text-sm"
          aria-label="Usuarios en riesgo medio y alto"
        >
          <thead>
            <tr className="border-b border-[var(--line)]">
              {th("user_id", "ID")}
              {th("country", "País")}
              {th("plan", "Plan")}
              {th("mrr_usd", "MRR")}
              {th("base_churn_score", "Score")}
              {th("local_risk_level", "Riesgo")}
            </tr>
          </thead>
          <tbody>
            {paginated.map((s) => (
              <tr
                key={s.user_id}
                className="border-b border-[var(--line)] hover:bg-elevated/60 transition-colors"
              >
                <td className="px-3 py-2 font-mono text-xs text-ink-dim">
                  {s.user_id}
                </td>
                <td className="px-3 py-2 text-ink">{s.country}</td>
                <td
                  className={cn(
                    "px-3 py-2 font-mono text-xs",
                    PLAN_COLORS[s.plan],
                  )}
                >
                  {s.plan}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-ink">
                  $
                  {s.mrr_usd.toLocaleString("es", { minimumFractionDigits: 0 })}
                </td>
                <td className="px-3 py-2 font-mono text-xs font-bold text-ink">
                  {(s.base_churn_score * 100).toFixed(0)}%
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        RISK_DOT[s.local_risk_level],
                      )}
                    />
                    <span className="text-xs font-mono">
                      {RISK_LABELS[s.local_risk_level]}
                    </span>
                  </span>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-ink-muted font-mono text-xs"
                >
                  No hay usuarios en riesgo medio o alto
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-3 py-2.5 border-t border-[var(--line)] flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-ink-muted">
            Filas por página:
          </span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="bg-elevated border border-[var(--line)] rounded px-2 py-1 text-xs font-mono text-ink focus:outline-none focus:border-brand"
            aria-label="Filas por página"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span className="text-xs font-mono text-ink-muted">
            {sorted.length.toLocaleString("es")} usuarios
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs font-mono text-ink-muted mr-2">
            {safePage} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            aria-label="Página anterior"
            className="p-1.5 rounded border border-[var(--line)] text-ink-muted hover:text-ink hover:border-brand disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            aria-label="Página siguiente"
            className="p-1.5 rounded border border-[var(--line)] text-ink-muted hover:text-ink hover:border-brand disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
