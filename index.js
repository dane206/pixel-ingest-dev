import express from "express";
import { BigQuery } from "@google-cloud/bigquery";

const app = express();
app.disable("x-powered-by");

const SERVICE_NAME = process.env.K_SERVICE || "pixel-ingest";
const API_VERSION = "v1";
const V1_TRACK_PATH = "/v1/track";

/* =========================
   CORS
========================= */
app.use(function (req, res, next) {
  const origin = req.get("origin");

  if (!origin || origin === "null") {
    res.setHeader("access-control-allow-origin", "*");
  } else {
    res.setHeader("access-control-allow-origin", origin);
    res.setHeader("vary", "Origin");
  }

  res.setHeader("access-control-allow-methods", "POST, OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type");
  res.setHeader("access-control-max-age", "600");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
});

/* =========================
   Body parsing
========================= */
app.use(
  express.json({
    limit: "256kb",
    type: ["application/json", "text/plain"]
  })
);

/* =========================
   BigQuery (RAW ledger)
   - required env vars
========================= */
const bq = new BigQuery();

const DATASET = process.env.BQ_DATASET;
const TABLE = process.env.BQ_TABLE;

if (!DATASET || !TABLE) {
  throw new Error("Missing required env vars: BQ_DATASET and/or BQ_TABLE");
}

/* =========================
   GA4 Measurement Protocol
========================= */
const GA4_MEASUREMENT_ID = process.env.GA4_MEASUREMENT_ID || null;
const GA4_API_SECRET = process.env.GA4_API_SECRET || null;
const GA4_MP_MODE = process.env.GA4_MP_MODE || "collect"; // "collect" | "debug"

async function getFetch() {
  if (typeof fetch === "function") return fetch;
  const mod = await import("node-fetch");
  return mod.default;
}

function mapTerraToGa4EventName(name) {
  switch (name) {
    case "terra_begin_checkout": return "begin_checkout";
    case "terra_add_shipping_info": return "add_shipping_info";
    case "terra_add_payment_info": return "add_payment_info";
    case "terra_purchase": return "purchase";
    default: return null;
  }
}

function safeNumber(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

async function forwardToGA4MP(ev) {
  if (!GA4_MEASUREMENT_ID || !GA4_API_SECRET) return;

  const terraName = ev.event_name || ev.event || null;
  const ga4Name = mapTerraToGa4EventName(terraName);
  if (!ga4Name) return;

  const payload = ev.payload || {};
  const eco = payload.ecommerce || {};
  const items = Array.isArray(eco.items) ? eco.items : [];

  let clientId = payload.ga4_client_id || null;
  if (!clientId) clientId = String(Math.floor(Math.random() * 1e10)) + "." + String(Date.now());

  const params = {
    currency: eco.currency || "USD",
    value: safeNumber(eco.value) || 0,
    items: items,

    transaction_id: eco.transaction_id ? String(eco.transaction_id) : undefined,
    shipping: safeNumber(eco.shipping),
    tax: safeNumber(eco.tax),
    shipping_tier: eco.shipping_tier ? String(eco.shipping_tier) : undefined,

    session_id: payload.ga4_session_id ? String(payload.ga4_session_id) : undefined,
    session_number: safeNumber(payload.ga4_session_number),

    engagement_time_msec: 1,

    terra_event_id: ev.event_id || undefined,
    terra_event_name: terraName || undefined
  };

  Object.keys(params).forEach((k) => {
    if (params[k] === undefined || params[k] === null) delete params[k];
  });

  const mpBody = {
    client_id: clientId,
    events: [{ name: ga4Name, params }]
  };

  const base =
    (GA4_MP_MODE === "debug")
      ? "https://www.google-analytics.com/debug/mp/collect"
      : "https://www.google-analytics.com/mp/collect";

  const url =
    base +
    "?measurement_id=" + encodeURIComponent(GA4_MEASUREMENT_ID) +
    "&api_secret=" + encodeURIComponent(GA4_API_SECRET);

  const _fetch = await getFetch();
  const r = await _fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(mpBody)
  });

  const text = await r.text();
  console.log("[ga4-mp]", ga4Name, r.status, text.slice(0, 300));
}

/* =========================
   Track handler
========================= */
async function handleTrack(req, res) {
  const body = req.body;

  const events = Array.isArray(body && body.events)
    ? body.events
    : Array.isArray(body)
      ? body
      : body
        ? [body]
        : [];

  const receivedAtIso = new Date().toISOString();

  try {
    if (events.length) {
      const rows = [];

      for (let i = 0; i < events.length; i++) {
        const ev = events[i] || {};
        rows.push({
          received_at: new Date(receivedAtIso),
          data_source: ev.data_source || ev.source || "unknown",
          event_name: ev.event_name || ev.event || null,
          event_id: ev.event_id || null,
          event_time: (ev.event_time || ev.timestamp) ? new Date(ev.event_time || ev.timestamp) : null,
          raw: JSON.parse(JSON.stringify(ev))
        });
      }

      await bq.dataset(DATASET).table(TABLE).insert(rows, { ignoreUnknownValues: false, skipInvalidRows: false });

      // After ledger write, forward to GA4 MP (fire-and-forget)
      for (let i = 0; i < events.length; i++) {
        const ev = events[i] || {};
        forwardToGA4MP(ev).catch((e) => {
          console.log("[ga4-mp] error", String(e && e.message ? e.message : e));
        });
      }
    }
  } catch (err) {
    console.error("[" + SERVICE_NAME + "] ingest error", err);
  }

  res.status(204).end();
}

/* =========================
   Routes
========================= */
app.post(V1_TRACK_PATH, handleTrack); // canonical
app.post("/track", handleTrack);      // back-compat

app.get("/health", function (_req, res) {
  res.status(200).send("ok");
});

app.get("/version", function (_req, res) {
  res.status(200).json({
    service: SERVICE_NAME,
    api_version: API_VERSION
  });
});

/* =========================
   Boot
========================= */
const PORT = Number(process.env.PORT || 8080);
app.listen(PORT, function () {
  console.log("[" + SERVICE_NAME + "] listening", { port: PORT, api_version: API_VERSION });
});
