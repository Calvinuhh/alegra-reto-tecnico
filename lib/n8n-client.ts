import type { ChurnSignal, AnalysisSummary } from "./types";

const TIMEOUT_MS = 10_000;

export interface N8nPayload {
  signals: ChurnSignal[];
  summary: AnalysisSummary;
  report_email: string;
  file_stats: {
    users_count: number;
    tickets_count: number;
    features_count: number;
  };
  analyzed_at: string;
}

export async function fireN8nWebhook(payload: N8nPayload): Promise<boolean> {
  const url = process.env.N8N_WEBHOOK_URL;

  if (!url || url.includes("placeholder-replace-me")) {
    throw new Error(
      "N8N_WEBHOOK_URL no esta configurado. " +
        "Reemplaza el placeholder en .env.local con tu URL real de n8n.",
    );
  }

  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(tid);
    return res.ok;
  } catch (err) {
    clearTimeout(tid);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("n8n no respondio en 10 segundos (timeout)");
    }
    throw err;
  }
}
