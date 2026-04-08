import type { NextRequest } from "next/server";
import { parseAndAnalyze } from "@/lib/csv-parser";
import { fireN8nWebhook } from "@/lib/n8n-client";
import type { AnalysisResult, AnalysisSummary, ChurnSignal } from "@/lib/types";

export const maxDuration = 30;

function generateLocalInsights(
  summary: AnalysisSummary,
  signals: ChurnSignal[],
): { insights: string[]; recommended_actions: string[] } {
  const highRisk = signals.filter((s) => s.local_risk_level === "high");
  const pctHigh = ((summary.high_risk_count / summary.total_users) * 100).toFixed(1);

  const planCounts = Object.entries(summary.by_plan)
    .filter(([, v]) => v.high_risk > 0)
    .sort(([, a], [, b]) => b.high_risk - a.high_risk);
  const worstPlan = planCounts[0]?.[0] ?? "Free";

  const countryCounts = Object.entries(summary.by_country)
    .sort(([, a], [, b]) => b.high_risk - a.high_risk);
  const worstCountry = countryCounts[0]?.[0] ?? "Colombia";

  const avgInactivity =
    highRisk.length > 0
      ? Math.round(
          highRisk.reduce((s, u) => s + u.days_since_last_use, 0) / highRisk.length,
        )
      : 0;

  const withCritical = highRisk.filter((u) => u.critical_tickets > 0).length;
  const pctCritical =
    highRisk.length > 0
      ? ((withCritical / highRisk.length) * 100).toFixed(0)
      : "0";

  const insights = [
    `Se detectaron ${summary.high_risk_count} usuarios en alto riesgo (${pctHigh}% del total), con un MRR en riesgo de $${summary.total_mrr_at_risk.toFixed(0)} USD`,
    `El plan ${worstPlan} concentra la mayor cantidad de usuarios en alto riesgo (${planCounts[0]?.[1]?.high_risk ?? 0} usuarios)`,
    `${worstCountry} lidera en usuarios de alto riesgo con ${countryCounts[0]?.[1]?.high_risk ?? 0} cuentas comprometidas`,
    `Los usuarios de alto riesgo tienen un promedio de ${avgInactivity} dias sin actividad, indicando desenganche progresivo`,
    `El ${pctCritical}% de los usuarios en alto riesgo tienen tickets criticos sin resolver, lo cual acelera el abandono`,
  ];

  const recommended_actions = [
    `Contactar proactivamente a los top ${Math.min(20, highRisk.length)} usuarios de mayor riesgo esta semana con llamadas personalizadas`,
    `Resolver los ${summary.open_tickets_total} tickets abiertos priorizando los criticos de cuentas en alto riesgo`,
    `Implementar onboarding guiado para usuarios ${worstPlan} con baja adopcion de features`,
    `Crear campana de reactivacion para usuarios inactivos por mas de 30 dias con ofertas de upgrade`,
    `Programar sesiones de check-in mensuales con cuentas Pro y Plus en riesgo medio para prevenir escalada`,
  ];

  return { insights, recommended_actions };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const usersFile = formData.get("users") as File | null;
    const ticketsFile = formData.get("tickets") as File | null;
    const featuresFile = formData.get("features") as File | null;
    const reportEmail = String(formData.get("report_email") ?? "").trim();

    if (!usersFile || !ticketsFile || !featuresFile) {
      return Response.json(
        { error: "Se requieren los 3 archivos CSV: users, tickets, features" },
        { status: 400 },
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(reportEmail)) {
      return Response.json(
        { error: "El email de reporte no es valido" },
        { status: 400 },
      );
    }

    const [usersCSV, ticketsCSV, featuresCSV] = await Promise.all([
      usersFile.text(),
      ticketsFile.text(),
      featuresFile.text(),
    ]);

    const local = parseAndAnalyze(usersCSV, ticketsCSV, featuresCSV);
    const { insights, recommended_actions } = generateLocalInsights(
      local.summary,
      local.signals,
    );

    try {
      await fireN8nWebhook({
        signals: local.signals,
        summary: local.summary,
        report_email: reportEmail,
        file_stats: local.file_stats,
        analyzed_at: local.analyzed_at,
      });
    } catch (err) {
      const n8nError =
        err instanceof Error
          ? err.message
          : "Error desconocido al contactar n8n";
      console.warn("[/api/analyze] n8n fallo:", n8nError);
    }

    const result: AnalysisResult = {
      ...local,
      insights,
      recommended_actions,
    };

    return Response.json(result);
  } catch (err) {
    console.error("[/api/analyze]", err);
    return Response.json(
      {
        error:
          err instanceof Error ? err.message : "Error interno del servidor",
      },
      { status: 500 },
    );
  }
}
