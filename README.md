# Alegra Churn Predictor

Reto Técnico — AI Ops Engineer @ Alegra · Rol C: Ops Analyst de Customer Success

**Demo en vivo:** https://alegra-reto-tecnico.onrender.com

---

## Entregables

- [x] Repositorio GitHub con código fuente
- [x] `resources/Alegra Agents.json` — workflow n8n exportado
- [x] Interfaz web interactiva desplegada en Render
- [x] 2 agentes IA coordinados (Agente 1: enriquecimiento de riesgo · Agente 2: estrategia de retención)
- [x] 2 integraciones activas (Gmail + Google Sheets)
- [x] Video demo - https://youtu.be/7Jf_dDVSPIU
- [x] Enlace al Google Sheets - https://docs.google.com/spreadsheets/d/1FsOxwwWOGVSA2MZPk8NX97dslBXceJm0DLBwSppsoig/edit?gid=0#gid=0

---

## Arquitectura

```
┌─────────────────────────────────────────┐
│            USUARIO (Browser)             │
│    Sube 3 CSVs + escribe su email        │
└────────────────┬────────────────────────┘
                 │ POST /api/analyze
                 ▼
┌─────────────────────────────────────────┐
│           NEXT.JS  (Render)              │
│                                          │
│  1. csv-parser.ts                        │
│     → Scoring local para los 2000 users  │
│     → Responde al browser al instante    │
│                                          │
│  2. n8n-client.ts (fire-and-forget)      │
│     → Dispara webhook async sin esperar  │
└──────┬───────────────────────┬──────────┘
       │ 200 OK (< 1s)         │ POST async (background)
       ▼                       ▼
┌─────────────┐   ┌─────────────────────────────────────┐
│  Dashboard  │   │         n8n                          │
│  (browser)  │   │                                       │
│  Muestra    │   │  Webhook                              │
│  resultados │   │    ↓                                  │
│  locales    │   │  Preparar Datos (Code)                │
│  al instante│   │    ↓                                  │
└─────────────┘   │  Agente 1 — Analista Churn            │
                  │  Claude 3.5 Haiku vía OpenRouter       │
                  │  → Enriquece top 50 usuarios con LLM  │
                  │    ↓                                   │
                  │  Parsear Agente 1 (Code + fallback)    │
                  │    ↓                                   │
                  │  Agente 2 — Estratega Retención        │
                  │  Claude 3.5 Haiku vía OpenRouter       │
                  │  → 5 insights + 5 acciones concretas   │
                  │    ↓                                   │
                  │  Parsear Agente 2 (Code + fallback)    │
                  │    ↓                                   │
                  │  Google Sheets — Append Row            │
                  │  → Registra el análisis con métricas   │
                  │    ↓                                   │
                  │  Preparar Payload PDF (Code)           │
                  │    ↓                                   │
                  │  POST /api/export-pdf (Next.js)        │
                  │  → Genera PDF con pdf-lib (server)     │
                  │    ↓                                   │
                  │  Gmail — Enviar Reporte                │
                  │  → PDF adjunto al email del usuario    │
                  └─────────────────────────────────────────┘
```

**Decisión clave — arquitectura async:**
Next.js responde al browser en < 1 segundo con los resultados del scoring local. El workflow de n8n corre en paralelo en background. El usuario ve su dashboard de inmediato; el email con el PDF llega unos segundos después. Esto evita que el usuario espere los 30–40 segundos que tarda el LLM.

---

## Stack tecnológico

| Capa          | Tecnología                                                  |
| ------------- | ----------------------------------------------------------- |
| Frontend      | Next.js 16.2.2 · React 19 · TypeScript · Tailwind CSS v4    |
| Runtime       | Bun                                                         |
| PDF           | pdf-lib (generación server-side, sin dependencias externas) |
| CSV parsing   | PapaParse                                                   |
| Gráficos      | Recharts                                                    |
| Orquestación  | n8n self-hosted                                             |
| LLM           | Claude 3.5 Haiku vía OpenRouter API                         |
| Integraciones | Gmail OAuth2 · Google Sheets OAuth2                         |
| Rate limiting | Proxy middleware Next.js v16 (solo `/api/analyze`)          |
| Deploy        | Render free tier                                            |

---

## Variables de entorno

Crear `.env` en la raíz del proyecto:

```env
N8N_WEBHOOK_URL=url_webhook_n8n_para_exportar_pdf
AUTH_TOKEN=tu_token_secreto_aqui
```

`AUTH_TOKEN` debe coincidir con el valor configurado en las variables de entorno de n8n (`$vars.AUTH_TOKEN`). El endpoint `/api/export-pdf` lo valida con `Bearer {AUTH_TOKEN}`.

---

## Cómo correr en local

**Requisitos:** Bun >= 1.1.0

```bash
git clone <repo>
cd alegra-prueba-tecnica-calvin
bun install
cp .env.example .env
# editar .env con tus valores
bun run dev
```

Abre `http://localhost:3000`, sube los 3 CSVs de `resources/csv/` e ingresa tu email.

---

## Workflow n8n

El JSON exportado está en `resources/Alegra Agents.json`.

**Para importar:**

1. En n8n, ir a Workflows → Import from file
2. Seleccionar `Alegra Agents.json`
3. Configurar manualmente en el nodo **"Generar PDF"**:
   - URL: cambiar la URL de ngrok por la URL de tu deploy en Render (`https://<app>.onrender.com/api/export-pdf`)
   - Header `Authorization`: cambiar el token hardcodeado por `Bearer {{$vars.AUTH_TOKEN}}`
4. Activar el workflow

**Credenciales necesarias en n8n:**

- OpenRouter API (para ambos agentes)
- Google Sheets OAuth2
- Gmail OAuth2

---

## Agentes IA

### Agente 1 — Analista Churn

- **Input:** Top 50 usuarios ordenados por `base_churn_score` descendente
- **Tarea:** Enriquecer cada usuario con `llm_risk_score` (float 0–1) y `llm_reasoning` (razón concisa en español, max 100 chars)
- **Output forzado:** JSON Schema estricto con clave `enriched` (array de 50 objetos)
- **Fallback:** Si el LLM falla o devuelve JSON inválido, se usa el `base_churn_score` local como `llm_risk_score`

### Agente 2 — Estratega Retención

- **Input:** Resumen ejecutivo del análisis + top 5 usuarios más críticos enriquecidos
- **Tarea:** Generar 5 insights analíticos y 5 acciones concretas para el equipo de CS
- **Output forzado:** JSON Schema estricto con claves `insights` y `recommended_actions`
- **Fallback:** Si el LLM falla o devuelve arrays vacíos, se usa un set de fallback estático con datos reales del análisis (conteos reales, no mensajes genéricos)

---
