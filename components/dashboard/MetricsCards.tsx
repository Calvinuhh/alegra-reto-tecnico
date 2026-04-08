import { Users, TrendingDown, DollarSign, AlertCircle } from "lucide-react";
import type { AnalysisSummary } from "@/lib/types";

interface MetricsCardsProps {
  summary: AnalysisSummary;
}

interface CardConfig {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: "true" }>;
  label: string;
  value: (s: AnalysisSummary) => string;
  sub: (s: AnalysisSummary) => string;
  accent: string;
  delay: string;
}

const CARDS: CardConfig[] = [
  {
    icon: Users,
    label: "Total usuarios",
    value: (s) => s.total_users.toLocaleString("es"),
    sub: (s) => `${s.medium_risk_count.toLocaleString("es")} en riesgo medio`,
    accent: "text-ink",
    delay: "0ms",
  },
  {
    icon: TrendingDown,
    label: "Alto riesgo",
    value: (s) => s.high_risk_count.toLocaleString("es"),
    sub: (s) =>
      `${((s.high_risk_count / Math.max(s.total_users, 1)) * 100).toFixed(1)}% del total`,
    accent: "text-danger",
    delay: "80ms",
  },
  {
    icon: DollarSign,
    label: "MRR en riesgo",
    value: (s) =>
      new Intl.NumberFormat("es", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(s.total_mrr_at_risk),
    sub: () => "usuarios de alto riesgo",
    accent: "text-warning",
    delay: "160ms",
  },
  {
    icon: AlertCircle,
    label: "Tickets abiertos",
    value: (s) => s.open_tickets_total.toLocaleString("es"),
    sub: (s) => `score churn promedio ${(s.avg_churn_score * 100).toFixed(0)}%`,
    accent: "text-ink-dim",
    delay: "240ms",
  },
];

export function MetricsCards({ summary }: MetricsCardsProps) {
  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      role="region"
      aria-label="Métricas principales del análisis"
    >
      {CARDS.map(({ icon: Icon, label, value, sub, accent, delay }) => (
        <div
          key={label}
          className="animate-fade-up bg-surface border border-[var(--line)] rounded p-4 flex flex-col gap-3"
          style={{ animationDelay: delay }}
        >
          <div className="flex items-center justify-between">
            <p className="text-ink-muted text-xs font-mono uppercase tracking-wider">
              {label}
            </p>
            <Icon
              className={`w-4 h-4 ${accent} opacity-70`}
              aria-hidden="true"
            />
          </div>

          <div>
            <p
              className={`text-2xl font-bold font-mono ${accent} leading-none`}
            >
              {value(summary)}
            </p>
            <p className="text-ink-muted text-xs mt-1.5 font-mono">
              {sub(summary)}
            </p>
          </div>

          {}
          <div className="h-px w-full bg-[var(--line)]" />
        </div>
      ))}
    </div>
  );
}
