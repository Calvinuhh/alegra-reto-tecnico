"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import type { AnalysisResult } from "@/lib/types";
import { MetricsCards } from "@/components/dashboard/MetricsCards";
import { RiskChart } from "@/components/dashboard/RiskChart";
import { HighRiskTable } from "@/components/dashboard/HighRiskTable";

export default function DashboardPage() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = sessionStorage.getItem("churn_analysis");
    if (raw) {
      try {
        setResult(JSON.parse(raw));
      } catch {
        setResult(null);
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="flex items-center gap-3 text-ink-muted font-mono text-sm">
          <span className="w-2 h-2 rounded-full bg-brand animate-pulse-brand" />
          Cargando analisis...
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-full flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <AlertTriangle
            className="w-10 h-10 text-danger mx-auto mb-4"
            aria-hidden="true"
          />
          <h2 className="text-xl font-bold text-ink mb-2">
            Sin datos de analisis
          </h2>
          <p className="text-ink-muted text-sm font-mono mb-6">
            No se encontraron resultados. Vuelve a cargar los archivos CSV.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-brand text-base text-sm font-semibold hover:bg-brand-dim transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const highRisk = result.signals.filter((s) => s.local_risk_level === "high");
  const mediumRisk = result.signals.filter(
    (s) => s.local_risk_level === "medium",
  );

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-20 bg-base/80 backdrop-blur border-b border-[var(--line)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 rounded border border-[var(--line)] text-ink-muted hover:text-ink hover:border-brand transition-colors"
              aria-label="Volver al inicio"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            </Link>
            <div>
              <h1 className="text-sm font-semibold text-ink leading-none">
                Dashboard de Churn
              </h1>
              <p className="text-xs font-mono text-ink-muted mt-0.5">
                {result.file_stats.users_count.toLocaleString("es")} usuarios ·{" "}
                {result.file_stats.tickets_count.toLocaleString("es")} tickets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse-brand" />
            <span className="text-xs font-mono text-ink-dim">
              {new Date(result.analyzed_at).toLocaleString("es")}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        <MetricsCards summary={result.summary} />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          <div className="lg:col-span-3 bg-surface border border-[var(--line)] rounded p-4">
            <h2 className="text-xs font-mono uppercase tracking-wider text-ink-muted mb-3">
              Distribucion de riesgo por plan
            </h2>
            <RiskChart byPlan={result.summary.by_plan} />
          </div>

          <div className="lg:col-span-2 flex flex-col gap-4">
            {result.insights.length > 0 && (
              <div className="bg-surface border border-[var(--line)] rounded p-4">
                <h2 className="text-xs font-mono uppercase tracking-wider text-ink-muted mb-3">
                  Insights
                </h2>
                <ul className="space-y-2">
                  {result.insights.map((insight, i) => (
                    <li
                      key={i}
                      className="flex gap-2 text-xs font-mono text-ink-dim leading-relaxed"
                    >
                      <span className="text-brand mt-0.5 shrink-0">
                        &#9656;
                      </span>
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {result.recommended_actions.length > 0 && (
          <div className="bg-surface border border-[var(--line)] rounded p-4">
            <h2 className="text-xs font-mono uppercase tracking-wider text-ink-muted mb-3">
              Acciones Recomendadas
            </h2>
            <ol className="space-y-2">
              {result.recommended_actions.map((action, i) => (
                <li
                  key={i}
                  className="flex gap-3 text-xs font-mono text-ink-dim leading-relaxed"
                >
                  <span className="text-brand font-bold shrink-0 w-4 text-right">
                    {i + 1}.
                  </span>
                  <span>{action}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="bg-surface border border-[var(--line)] rounded">
          <div className="px-4 py-3 border-b border-[var(--line)] flex items-center justify-between">
            <h2 className="text-xs font-mono uppercase tracking-wider text-ink-muted">
              Usuarios en riesgo
            </h2>
            <span className="text-xs font-mono text-danger font-bold">
              {highRisk.length} alto · {mediumRisk.length} medio
            </span>
          </div>
          <HighRiskTable signals={result.signals} />
        </div>

        <div className="text-center pb-4">
          <p className="text-xs font-mono text-ink-muted opacity-40">
            {result.file_stats.users_count.toLocaleString("es")} usuarios ·{" "}
            {result.file_stats.tickets_count.toLocaleString("es")} tickets ·{" "}
            {result.file_stats.features_count.toLocaleString("es")} registros de
            uso
          </p>
        </div>
      </main>
    </div>
  );
}
