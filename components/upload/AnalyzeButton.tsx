"use client";

import { Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnalyzeButtonProps {
  canAnalyze: boolean;
  isLoading: boolean;
  onClick: () => void;
  disabledMessage?: string;
}

export function AnalyzeButton({
  canAnalyze,
  isLoading,
  onClick,
  disabledMessage,
}: AnalyzeButtonProps) {
  const active = canAnalyze && !isLoading;

  return (
    <div className="flex flex-col items-center gap-2">
      {}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {isLoading ? "Analizando archivos con IA..." : ""}
      </div>

      <button
        type="button"
        disabled={!active}
        onClick={active ? onClick : undefined}
        aria-disabled={!active}
        aria-busy={isLoading}
        className={cn(
          "relative flex items-center gap-3 px-8 py-3.5 rounded font-semibold text-sm tracking-wide transition-all duration-200",
          "focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-base",

          active && [
            "bg-brand text-base cursor-pointer",
            "shadow-[0_0_24px_rgba(0,200,160,0.35)]",
            "hover:bg-brand-dim hover:shadow-[0_0_32px_rgba(0,200,160,0.5)]",
            "active:scale-[0.98]",
          ],

          isLoading && [
            "bg-brand/80 text-base cursor-wait",
            "shadow-[0_0_16px_rgba(0,200,160,0.2)]",
          ],

          !canAnalyze &&
            !isLoading && [
              "bg-elevated text-ink-muted cursor-not-allowed",
              "border border-[var(--line)]",
            ],
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            <span>Analizando con IA...</span>
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" aria-hidden="true" />
            <span>Analizar churn</span>
          </>
        )}
      </button>

      {!canAnalyze && !isLoading && (
        <p className="text-ink-muted text-xs font-mono" aria-live="polite">
          {disabledMessage ?? "Carga los 3 archivos CSV para continuar"}
        </p>
      )}
    </div>
  );
}
