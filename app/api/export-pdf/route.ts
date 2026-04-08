import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";
import type { NextRequest } from "next/server";

const BRAND_TEAL = rgb(0, 0.784, 0.627);
const DARK_BG = rgb(0.067, 0.075, 0.09);
const CARD_BG = rgb(0.098, 0.106, 0.122);
const WHITE = rgb(1, 1, 1);
const GRAY = rgb(0.6, 0.6, 0.6);
const RED = rgb(0.933, 0.267, 0.267);
const YELLOW = rgb(0.98, 0.753, 0.18);
const GREEN = rgb(0.18, 0.8, 0.443);
const LIGHT_ROW = rgb(0.11, 0.118, 0.137);

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;


interface PdfPayload {
  summary: {
    total_users: number;
    high_risk_count: number;
    medium_risk_count: number;
    low_risk_count: number;
    total_mrr_at_risk: number;
    open_tickets_total: number;
    avg_churn_score: number;
    by_plan: Record<
      string,
      {
        total: number;
        high_risk: number;
        medium_risk: number;
        low_risk: number;
      }
    >;
    by_country: Record<string, { total: number; high_risk: number }>;
  };
  insights: string[];
  recommended_actions: string[];
  analyzed_at: string;
}

interface DrawCtx {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  font: PDFFont;
  fontBold: PDFFont;
}

function newPage(ctx: DrawCtx): PDFPage {
  const page = ctx.doc.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_W,
    height: PAGE_H,
    color: DARK_BG,
  });
  ctx.page = page;
  ctx.y = PAGE_H - MARGIN;
  return page;
}

function checkPage(ctx: DrawCtx, needed: number): void {
  if (ctx.y - needed < MARGIN) {
    newPage(ctx);
  }
}

function drawTitle(ctx: DrawCtx, text: string, size = 18): void {
  checkPage(ctx, size + 10);
  ctx.page.drawText(text, {
    x: MARGIN,
    y: ctx.y,
    size,
    font: ctx.fontBold,
    color: BRAND_TEAL,
  });
  ctx.y -= size + 8;
}

function drawText(ctx: DrawCtx, text: string, size = 10, color = GRAY): void {
  checkPage(ctx, size + 4);
  const maxChars = Math.floor(CONTENT_W / (size * 0.52));
  const lines = wrapText(text, maxChars);
  for (const line of lines) {
    checkPage(ctx, size + 4);
    ctx.page.drawText(line, {
      x: MARGIN,
      y: ctx.y,
      size,
      font: ctx.font,
      color,
    });
    ctx.y -= size + 4;
  }
}

function wrapText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = current ? current + " " + word : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawSeparator(ctx: DrawCtx): void {
  checkPage(ctx, 10);
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE_W - MARGIN, y: ctx.y },
    thickness: 0.5,
    color: rgb(0.2, 0.2, 0.2),
  });
  ctx.y -= 10;
}

function drawMetricCard(
  ctx: DrawCtx,
  x: number,
  label: string,
  value: string,
  cardW: number,
): void {
  const cardH = 50;
  ctx.page.drawRectangle({
    x,
    y: ctx.y - cardH,
    width: cardW,
    height: cardH,
    color: CARD_BG,
    borderColor: rgb(0.18, 0.18, 0.2),
    borderWidth: 1,
  });
  ctx.page.drawText(label, {
    x: x + 8,
    y: ctx.y - 18,
    size: 8,
    font: ctx.font,
    color: GRAY,
  });
  ctx.page.drawText(value, {
    x: x + 8,
    y: ctx.y - 38,
    size: 16,
    font: ctx.fontBold,
    color: BRAND_TEAL,
  });
}

function riskColor(level: string) {
  if (level === "high") return RED;
  if (level === "medium") return YELLOW;
  return GREEN;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 2) + ".." : str;
}

function drawTableHeader(
  ctx: DrawCtx,
  cols: { label: string; width: number }[],
): void {
  const rowH = 18;
  checkPage(ctx, rowH);
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - rowH,
    width: CONTENT_W,
    height: rowH,
    color: CARD_BG,
  });
  let xOff = MARGIN + 4;
  for (const col of cols) {
    ctx.page.drawText(col.label, {
      x: xOff,
      y: ctx.y - 13,
      size: 7,
      font: ctx.fontBold,
      color: BRAND_TEAL,
    });
    xOff += col.width;
  }
  ctx.y -= rowH;
}

function drawTableRow(
  ctx: DrawCtx,
  values: string[],
  cols: { label: string; width: number }[],
  rowIndex: number,
  riskLevel?: string,
): void {
  const rowH = 16;
  checkPage(ctx, rowH);
  if (rowIndex % 2 === 0) {
    ctx.page.drawRectangle({
      x: MARGIN,
      y: ctx.y - rowH,
      width: CONTENT_W,
      height: rowH,
      color: LIGHT_ROW,
    });
  }
  let xOff = MARGIN + 4;
  for (let i = 0; i < values.length; i++) {
    const isRiskCol = cols[i].label === "Riesgo" || cols[i].label === "LLM";
    const color = isRiskCol && riskLevel ? riskColor(riskLevel) : WHITE;
    const text = truncate(values[i], Math.floor(cols[i].width / 4.5));
    ctx.page.drawText(text, {
      x: xOff,
      y: ctx.y - 12,
      size: 7,
      font: ctx.font,
      color,
    });
    xOff += cols[i].width;
  }
  ctx.y -= rowH;
}

export async function POST(request: NextRequest) {
  try {
    const expectedToken = process.env.AUTH_TOKEN;
    if (!expectedToken) {
      return Response.json(
        { error: "AUTH_TOKEN no configurado en el servidor" },
        { status: 500 },
      );
    }

    const authorization = request.headers.get("authorization") ?? "";
    const bearerPrefix = "Bearer ";
    const receivedToken = authorization.startsWith(bearerPrefix)
      ? authorization.slice(bearerPrefix.length).trim()
      : "";

    if (!receivedToken || receivedToken !== expectedToken) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    const payload: PdfPayload = await request.json();
    const { summary, insights, recommended_actions, analyzed_at } = payload;

    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    const ctx: DrawCtx = {
      doc,
      page: null as unknown as PDFPage,
      y: 0,
      font,
      fontBold,
    };

    newPage(ctx);

    ctx.y -= 40;
    ctx.page.drawText("ALEGRA", {
      x: MARGIN,
      y: ctx.y,
      size: 36,
      font: fontBold,
      color: BRAND_TEAL,
    });
    ctx.y -= 30;
    ctx.page.drawText("Prediccion de Churn - Reporte Completo", {
      x: MARGIN,
      y: ctx.y,
      size: 18,
      font: fontBold,
      color: WHITE,
    });
    ctx.y -= 20;
    const dateStr = analyzed_at
      ? new Date(analyzed_at).toLocaleDateString("es-CO", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : new Date().toLocaleDateString("es-CO");
    ctx.page.drawText("Generado: " + dateStr, {
      x: MARGIN,
      y: ctx.y,
      size: 10,
      font,
      color: GRAY,
    });
    ctx.y -= 15;
    ctx.page.drawText("Usuarios analizados: " + summary.total_users, {
      x: MARGIN,
      y: ctx.y,
      size: 10,
      font,
      color: GRAY,
    });
    ctx.y -= 30;

    drawSeparator(ctx);
    ctx.y -= 10;

    drawTitle(ctx, "Metricas Clave");
    ctx.y -= 5;

    checkPage(ctx, 60);
    const cardW = (CONTENT_W - 30) / 4;
    drawMetricCard(
      ctx,
      MARGIN,
      "Alto Riesgo",
      String(summary.high_risk_count),
      cardW,
    );
    drawMetricCard(
      ctx,
      MARGIN + cardW + 10,
      "Medio Riesgo",
      String(summary.medium_risk_count),
      cardW,
    );
    drawMetricCard(
      ctx,
      MARGIN + (cardW + 10) * 2,
      "Bajo Riesgo",
      String(summary.low_risk_count),
      cardW,
    );
    drawMetricCard(
      ctx,
      MARGIN + (cardW + 10) * 3,
      "MRR en Riesgo",
      "$" + summary.total_mrr_at_risk.toFixed(0),
      cardW,
    );
    ctx.y -= 60;

    checkPage(ctx, 60);
    const cardW2 = (CONTENT_W - 20) / 3;
    drawMetricCard(
      ctx,
      MARGIN,
      "Total Usuarios",
      String(summary.total_users),
      cardW2,
    );
    drawMetricCard(
      ctx,
      MARGIN + cardW2 + 10,
      "Tickets Abiertos",
      String(summary.open_tickets_total),
      cardW2,
    );
    drawMetricCard(
      ctx,
      MARGIN + (cardW2 + 10) * 2,
      "Score Promedio",
      summary.avg_churn_score.toFixed(2),
      cardW2,
    );
    ctx.y -= 65;

    drawSeparator(ctx);

    drawTitle(ctx, "Distribucion por Plan");
    const planCols = [
      { label: "Plan", width: 100 },
      { label: "Total", width: 80 },
      { label: "Alto", width: 80 },
      { label: "Medio", width: 80 },
      { label: "Bajo", width: 80 },
      { label: "% Alto Riesgo", width: 112 },
    ];
    drawTableHeader(ctx, planCols);
    Object.entries(summary.by_plan).forEach(([plan, data], i) => {
      const pct =
        data.total > 0
          ? ((data.high_risk / data.total) * 100).toFixed(1) + "%"
          : "0%";
      drawTableRow(
        ctx,
        [
          plan,
          String(data.total),
          String(data.high_risk),
          String(data.medium_risk),
          String(data.low_risk),
          pct,
        ],
        planCols,
        i,
      );
    });
    ctx.y -= 15;

    drawSeparator(ctx);

    drawTitle(ctx, "Distribucion por Pais");
    const countryCols = [
      { label: "Pais", width: 160 },
      { label: "Total", width: 110 },
      { label: "Alto Riesgo", width: 110 },
      { label: "% Alto Riesgo", width: 152 },
    ];
    drawTableHeader(ctx, countryCols);
    Object.entries(summary.by_country)
      .sort((a, b) => b[1].high_risk - a[1].high_risk)
      .forEach(([country, data], i) => {
        const pct =
          data.total > 0
            ? ((data.high_risk / data.total) * 100).toFixed(1) + "%"
            : "0%";
        drawTableRow(
          ctx,
          [country, String(data.total), String(data.high_risk), pct],
          countryCols,
          i,
        );
      });
    ctx.y -= 15;

    if (insights.length > 0) {
      drawSeparator(ctx);
      drawTitle(ctx, "Insights del Analisis IA");
      insights.forEach((insight, i) => {
        drawText(ctx, i + 1 + ". " + insight, 9, WHITE);
        ctx.y -= 2;
      });
      ctx.y -= 10;
    }

    if (recommended_actions.length > 0) {
      drawSeparator(ctx);
      drawTitle(ctx, "Acciones Recomendadas");
      recommended_actions.forEach((action, i) => {
        drawText(ctx, i + 1 + ". " + action, 9, WHITE);
        ctx.y -= 2;
      });
      ctx.y -= 10;
    }

    drawSeparator(ctx);
    drawText(
      ctx,
      "Reporte generado automaticamente por el sistema de prediccion de churn de Alegra.",
      8,
      GRAY,
    );
    drawText(
      ctx,
      "Powered by AI Agents + n8n + OpenRouter (Claude 3.5 Haiku)",
      8,
      GRAY,
    );

    const pdfBytes = await doc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="alegra-churn-report-' + Date.now() + '.pdf"',
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (err) {
    console.error("[/api/export-pdf]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Error generando PDF" },
      { status: 500 },
    );
  }
}
