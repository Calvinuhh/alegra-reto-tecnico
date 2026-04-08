"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UploadZone } from "@/components/upload/UploadZone";
import { AnalyzeButton } from "@/components/upload/AnalyzeButton";

const CSV_FILES = [
  { key: "users", label: "Usuarios", description: "alegra_users.csv" },
  {
    key: "tickets",
    label: "Tickets",
    description: "alegra_support_tickets.csv",
  },
  {
    key: "features",
    label: "Feature Usage",
    description: "alegra_feature_usage.csv",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [files, setFiles] = useState<Record<string, File | null>>({
    users: null,
    tickets: null,
    features: null,
  });
  const [reportEmail, setReportEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFileSelect = useCallback((key: string, file: File | null) => {
    setFiles((prev) => ({ ...prev, [key]: file }));
    setError(null);
  }, []);

  const allLoaded = CSV_FILES.every((f) => !!files[f.key]);
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reportEmail.trim());
  const canAnalyze = allLoaded && isValidEmail;
  const disabledMessage = !allLoaded
    ? "Carga los 3 archivos CSV para continuar"
    : "Ingresa un email valido para enviar el reporte";

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("users", files.users!);
    formData.append("tickets", files.tickets!);
    formData.append("features", files.features!);
    formData.append("report_email", reportEmail.trim());

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Error ${res.status}`);
      }

      const result = await res.json();
      sessionStorage.setItem("churn_analysis", JSON.stringify(result));
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-full flex flex-col">
      <div className="scanlines pointer-events-none fixed inset-0 z-0" />

      <div className="relative z-10 flex flex-col flex-1 items-center justify-center px-6 py-16">
        <div className="text-center mb-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-[var(--line-strong)] bg-surface mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse-brand" />
            <span className="text-xs font-mono text-ink-dim">
              Alegra · Customer Success
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink leading-tight">
            Churn Predictor
          </h1>

          <p className="text-ink-muted text-sm mt-3 font-mono leading-relaxed">
            Carga los 3 datasets de Alegra para analizar el riesgo de abandono
            de tus clientes con inteligencia artificial.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mb-8">
          {CSV_FILES.map(({ key, label, description }) => (
            <UploadZone
              key={key}
              fileKey={key}
              label={label}
              description={description}
              file={files[key] ?? null}
              onFileSelect={onFileSelect}
            />
          ))}
        </div>

        <div className="w-full max-w-2xl mb-8">
          <label
            htmlFor="report-email"
            className="block text-xs font-mono uppercase tracking-wider text-ink-muted mb-2"
          >
            Email para recibir el reporte PDF
          </label>
          <input
            id="report-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="tu@email.com"
            value={reportEmail}
            onChange={(e) => {
              setReportEmail(e.target.value);
              setError(null);
            }}
            className="w-full rounded border border-[var(--line-strong)] bg-surface px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brand"
          />
          <p className="mt-2 text-xs font-mono text-ink-muted">
            Enviaremos el PDF generado por n8n a este correo cuando termine el
            flujo.
          </p>
          {reportEmail.length > 0 && !isValidEmail && (
            <p className="mt-2 text-xs font-mono text-danger" role="alert">
              Ingresa un email valido.
            </p>
          )}
        </div>

        <AnalyzeButton
          canAnalyze={canAnalyze}
          isLoading={loading}
          onClick={handleAnalyze}
          disabledMessage={disabledMessage}
        />

        {error && (
          <div
            className="mt-6 px-4 py-3 rounded border border-danger/30 bg-danger/5 max-w-md text-center"
            role="alert"
          >
            <p className="text-danger text-sm font-mono">{error}</p>
          </div>
        )}

        <p className="text-ink-muted text-xs font-mono mt-12 opacity-40">
          n8n · OpenRouter · Claude · Next.js 16
        </p>
      </div>
    </div>
  );
}
