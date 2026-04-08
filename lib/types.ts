
export type Plan = "Free" | "Pyme" | "Plus" | "Pro";

export type TicketCategory =
  | "Bug"
  | "Billing"
  | "Onboarding"
  | "Feature_Request"
  | "Performance"
  | "Integration";

export type TicketPriority = "Low" | "Medium" | "High" | "Critical";
export type TicketStatus = "Open" | "In_Progress" | "Resolved" | "Closed";
export type AdoptionLevel =
  | "activated"
  | "used_1x"
  | "used_5x"
  | "used_10x"
  | "power_user";
export type RiskLevel = "low" | "medium" | "high";

export interface AlegraUser {
  user_id: string;
  country: string;
  plan: Plan;
  signup_date: string;
  source: string;
  mrr_usd: number;
  churn_risk_score: number;
  features_count: number;
}

export interface SupportTicket {
  ticket_id: string;
  user_id: string;
  category: TicketCategory;
  priority: TicketPriority;
  channel: string;
  created_date: string;
  resolved_date: string | null;
  status: TicketStatus;
  resolution_hours: number | null;
  csat_score: number | null;
}

export interface FeatureUsage {
  user_id: string;
  feature: string;
  adoption_level: AdoptionLevel;
  last_used_date: string;
}

export interface ChurnSignal {
  user_id: string;
  country: string;
  plan: Plan;
  mrr_usd: number;
  days_since_last_use: number;
  open_tickets: number;
  critical_tickets: number;
  feature_adoption_score: number;
  features_adopted: number;
  base_churn_score: number;
  local_risk_level: RiskLevel;
}

export interface PlanBreakdown {
  total: number;
  high_risk: number;
  medium_risk: number;
  low_risk: number;
}

export interface AnalysisSummary {
  total_users: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  total_mrr_at_risk: number;
  open_tickets_total: number;
  avg_churn_score: number;
  by_plan: Record<Plan, PlanBreakdown>;
  by_country: Record<string, { total: number; high_risk: number }>;
}

export interface AnalysisResult {
  signals: ChurnSignal[];
  summary: AnalysisSummary;
  insights: string[];
  recommended_actions: string[];
  analyzed_at: string;
  file_stats: {
    users_count: number;
    tickets_count: number;
    features_count: number;
  };
}
