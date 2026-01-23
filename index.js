import express from "express";
import { BigQuery } from "@google-cloud/bigquery";

const app = express();
app.disable("x-powered-by");

app.use(function (req, _res, next) {
  console.log("[pixel-ingest-dev]", req.method, req.path);
  next();
});

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
    case "checkout_started": return "begin_checkout";
    case "checkout_shipping_info_submitted": return "add_shipping_info";
    case "payment_info_submitted": return "add_payment_info";
    case "checkout_completed": return "purchase";
    default: return null;
  }
}

function safeNumber(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

async function forwardToGA4MP(ev) {
  if (!GA4_MEASUREMENT_ID || !GA4_API_SECRET) return;

  const ga4Name = mapTerraToGa4EventName(ev.event_name);
  if (!ga4Name) return;

  // ✅ THIS IS THE FIX — read Shopify checkout structure
  const checkout =
    ev.raw &&
    ev.raw.data &&
    ev.raw.data.checkout
      ? ev.raw.data.checkout
      : null;

  if (!checkout) return;

  const lines = checkout.lineItems || [];
  if (!lines.length) return;

  const items = [];

  for (let i = 0; i < lines.length; i++) {
    const li = lines[i];
    if (!li || !li.variant) continue;

    const productId = String(li.variant.product.id).replace(/\D/g, "");
    const variantId = String(li.variant.id).replace(/\D/g, "");

    items.push({
      item_id: "shopify_US_" + productId + "_" + variantId,
      item_name: li.title || "",
      price: Number(li.variant.price.amount),
      quantity: li.quantity || 1
    });
  }

  let clientId =
    (ev.raw && ev.raw.clientId) ||
    String(Math.floor(Math.random() * 1e10)) + "." + String(Date.now());

  const params = {
    currency: checkout.currencyCode,
    value: Number(checkout.totalPrice.amount),
    items,
    transaction_id:
      checkout.order && checkout.order.id
        ? String(checkout.order.id).replace(/\D/g, "")
        : undefined,
    engagement_time_msec: 1
  };

  Object.keys(params).forEach((k) => {
    if (params[k] === undefined) delete params[k];
  });

  const mpBody = {
    client_id: clientId,
    events: [{ name: ga4Name, params }]
  };

  const base =
    GA4_MP_MODE === "debug"
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
          raw: (JSON.stringify(ev))
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
  if (err.name === "PartialFailureError" && Array.isArray(err.errors)) {
    for (const e of err.errors) {
      console.error(
        "[pixel-ingest-dev] bq row error",
        JSON.stringify(e.errors, null, 2),
        "row:",
        JSON.stringify(e.row, null, 2)
      );
    }
  } else {
    console.error("[pixel-ingest-dev] bq error", err);
  }
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

// deploy check
