import Papa from "papaparse";
import type {
  AlegraUser,
  SupportTicket,
  FeatureUsage,
  ChurnSignal,
  AnalysisSummary,
  Plan,
  PlanBreakdown,
  RiskLevel,
  AnalysisResult,
} from "./types";

const PLANS: Plan[] = ["Free", "Pyme", "Plus", "Pro"];

const ADOPTION_WEIGHT: Record<string, number> = {
  activated: 0.1,
  used_1x: 0.25,
  used_5x: 0.5,
  used_10x: 0.8,
  power_user: 1.0,
};

function parseCSV<T>(content: string): T[] {
  const result = Papa.parse<T>(content, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    transformHeader: (h: string) => h.trim(),
    transform: (v: string) =>
      v === "" || v === "NULL" || v === "null" || v === "None" ? null : v,
  });
  return result.data;
}

function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 999;
  const d = new Date(dateStr as string);
  if (isNaN(d.getTime())) return 999;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

export type LocalAnalysis = Omit<
  AnalysisResult,
  "insights" | "recommended_actions"
>;

export function parseAndAnalyze(
  usersCSV: string,
  ticketsCSV: string,
  featuresCSV: string,
): LocalAnalysis {
  const users = parseCSV<AlegraUser>(usersCSV);
  const tickets = parseCSV<SupportTicket>(ticketsCSV);
  const features = parseCSV<FeatureUsage>(featuresCSV);

  const ticketsByUser = new Map<string, SupportTicket[]>();
  const featuresByUser = new Map<string, FeatureUsage[]>();

  for (const t of tickets) {
    const uid = String(t.user_id);
    ticketsByUser.set(uid, [...(ticketsByUser.get(uid) ?? []), t]);
  }
  for (const f of features) {
    const uid = String(f.user_id);
    featuresByUser.set(uid, [...(featuresByUser.get(uid) ?? []), f]);
  }

  const signals: ChurnSignal[] = users.map((user) => {
    const uid = String(user.user_id);
    const userTickets = ticketsByUser.get(uid) ?? [];
    const userFeats = featuresByUser.get(uid) ?? [];

    const lastDates = userFeats.map((f) => f.last_used_date).filter(Boolean);
    const days_since_last_use =
      lastDates.length > 0
        ? Math.min(...lastDates.map((d) => daysSince(d)))
        : 999;

    const open_tickets = userTickets.filter(
      (t) => t.status === "Open" || t.status === "In_Progress",
    ).length;

    const critical_tickets = userTickets.filter(
      (t) => t.priority === "Critical" || t.priority === "High",
    ).length;

    const weights = userFeats.map(
      (f) => ADOPTION_WEIGHT[f.adoption_level] ?? 0,
    );
    const feature_adoption_score =
      weights.length > 0
        ? weights.reduce((a, b) => a + b, 0) / weights.length
        : 0;

    const features_adopted = userFeats.length;

    const base_churn_score = Number(user.churn_risk_score) || 0;

    const inactivity =
      days_since_last_use > 30 ? 0.2 : days_since_last_use > 14 ? 0.1 : 0;
    const ticketRisk = open_tickets > 2 ? 0.15 : open_tickets > 0 ? 0.07 : 0;
    const critRisk =
      critical_tickets > 1 ? 0.15 : critical_tickets > 0 ? 0.08 : 0;
    const adoptRisk =
      feature_adoption_score < 0.2
        ? 0.15
        : feature_adoption_score < 0.4
          ? 0.07
          : 0;

    const composite =
      base_churn_score * 0.5 + inactivity + ticketRisk + critRisk + adoptRisk;

    const local_risk_level: RiskLevel =
      composite >= 0.65 ? "high" : composite >= 0.35 ? "medium" : "low";

    return {
      user_id: uid,
      country: user.country,
      plan: user.plan,
      mrr_usd: Number(user.mrr_usd) || 0,
      days_since_last_use,
      open_tickets,
      critical_tickets,
      feature_adoption_score,
      features_adopted,
      base_churn_score,
      local_risk_level,
    };
  });

  const high = signals.filter((s) => s.local_risk_level === "high");
  const med = signals.filter((s) => s.local_risk_level === "medium");
  const low = signals.filter((s) => s.local_risk_level === "low");

  const total_mrr_at_risk = high.reduce((sum, s) => sum + s.mrr_usd, 0);
  const open_tickets_total = signals.reduce(
    (sum, s) => sum + s.open_tickets,
    0,
  );
  const avg_churn_score =
    signals.length > 0
      ? signals.reduce((sum, s) => sum + s.base_churn_score, 0) / signals.length
      : 0;

  const by_plan = Object.fromEntries(
    PLANS.map((p): [Plan, PlanBreakdown] => {
      const ps = signals.filter((s) => s.plan === p);
      return [
        p,
        {
          total: ps.length,
          high_risk: ps.filter((s) => s.local_risk_level === "high").length,
          medium_risk: ps.filter((s) => s.local_risk_level === "medium").length,
          low_risk: ps.filter((s) => s.local_risk_level === "low").length,
        },
      ];
    }),
  ) as Record<Plan, PlanBreakdown>;

  const by_country: Record<string, { total: number; high_risk: number }> = {};
  for (const s of signals) {
    if (!by_country[s.country])
      by_country[s.country] = { total: 0, high_risk: 0 };
    by_country[s.country].total++;
    if (s.local_risk_level === "high") by_country[s.country].high_risk++;
  }

  const summary: AnalysisSummary = {
    total_users: signals.length,
    high_risk_count: high.length,
    medium_risk_count: med.length,
    low_risk_count: low.length,
    total_mrr_at_risk,
    open_tickets_total,
    avg_churn_score,
    by_plan,
    by_country,
  };

  return {
    signals,
    summary,
    analyzed_at: new Date().toISOString(),
    file_stats: {
      users_count: users.length,
      tickets_count: tickets.length,
      features_count: features.length,
    },
  };
}
