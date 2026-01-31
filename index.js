import express from "express";
import { BigQuery } from "@google-cloud/bigquery";
import { forwardCheckoutToGA4 } from "./ga4Forwarder.js";

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
          raw: ev
        });
      }

      await bq.dataset(DATASET).table(TABLE).insert(rows, { ignoreUnknownValues: false, skipInvalidRows: false });
      
      // After ledger write, forward to GA4 MP (fire-and-forget)
      for (let i = 0; i < events.length; i++) {
      	const ev = events[i] || {};
      	forwardCheckoutToGA4(ev).catch((e) => {
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
