"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { AnalysisSummary, Plan } from "@/lib/types";

interface RiskChartProps {
  byPlan: AnalysisSummary["by_plan"];
}

const PLAN_ORDER: Plan[] = ["Free", "Pyme", "Plus", "Pro"];

const COLORS = {
  "Alto riesgo": "#FF4B4B",
  "Riesgo medio": "#E89020",
  "Bajo riesgo": "#00C8A0",
};

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + p.value, 0);

  return (
    <div
      className="bg-overlay border border-[var(--line-strong)] rounded p-3 text-xs font-mono"
      role="tooltip"
    >
      <p className="text-ink font-semibold mb-2">{label}</p>
      {[...payload].reverse().map((p) => (
        <p
          key={p.name}
          className="flex justify-between gap-4"
          style={{ color: p.color }}
        >
          <span>{p.name}</span>
          <span className="font-bold">{p.value}</span>
        </p>
      ))}
      <p className="text-ink-muted mt-2 pt-2 border-t border-[var(--line)] flex justify-between gap-4">
        <span>Total</span>
        <span className="font-bold text-ink">{total}</span>
      </p>
    </div>
  );
}

export function RiskChart({ byPlan }: RiskChartProps) {
  const data = PLAN_ORDER.map((plan) => {
    const b = byPlan[plan];
    return {
      plan,
      "Alto riesgo": b?.high_risk ?? 0,
      "Riesgo medio": b?.medium_risk ?? 0,
      "Bajo riesgo": b?.low_risk ?? 0,
    };
  });

  return (
    <div
      aria-label="Gráfico de distribución de riesgo por plan"
      role="img"
      className="h-[260px] lg:h-[420px]"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          barSize={28}
          margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
        >
          <XAxis
            dataKey="plan"
            tick={{
              fill: "#8AA09A",
              fontSize: 11,
              fontFamily: "var(--font-jetbrains)",
            }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{
              fill: "#4A6660",
              fontSize: 10,
              fontFamily: "var(--font-jetbrains)",
            }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(0,200,160,0.05)" }}
          />
          <Legend
            wrapperStyle={{
              fontSize: 11,
              fontFamily: "var(--font-jetbrains)",
              color: "#8AA09A",
            }}
            iconType="square"
            iconSize={8}
          />
          <Bar dataKey="Bajo riesgo" stackId="a" fill={COLORS["Bajo riesgo"]} />
          <Bar
            dataKey="Riesgo medio"
            stackId="a"
            fill={COLORS["Riesgo medio"]}
          />
          <Bar
            dataKey="Alto riesgo"
            stackId="a"
            fill={COLORS["Alto riesgo"]}
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
