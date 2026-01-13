import express from "express";
import { BigQuery } from "@google-cloud/bigquery";

const app = express();
app.disable("x-powered-by");

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
========================= */
const bq = new BigQuery();

const DATASET = process.env.BQ_DATASET || "raw_dev";
const TABLE   = process.env.BQ_TABLE   || "events_raw";

/* =========================
   Contract
========================= */
const API_VERSION = "v1";
const V1_TRACK_PATH = "/v1/track";

/* =========================
   Track handler
========================= */
async function handleTrack(req, res) {
  try {
    const body = req.body;

    const events = Array.isArray(body && body.events)
      ? body.events
      : Array.isArray(body)
        ? body
        : body
          ? [body]
          : [];

    if (events.length) {
      const rows = [];
      const receivedAt = new Date().toISOString();

      for (let i = 0; i < events.length; i++) {
        const ev = events[i] || {};

        rows.push({
          received_at: receivedAt,
          data_source: ev.data_source || ev.source || "unknown",
          event_name: ev.event_name || ev.event || null,
          event_id: ev.event_id || null,
          event_time: ev.event_time || ev.timestamp || null,
          raw: ev
        });
      }

      await bq.dataset(DATASET).table(TABLE).insert(rows);
    }
  } catch (err) {
    console.error("[pixel-ingest-dev] insert error", err);
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
    service: "pixel-ingest-dev",
    api_version: API_VERSION
  });
});

/* =========================
   Boot
========================= */
const PORT = Number(process.env.PORT || 8080);
app.listen(PORT, function () {
  console.log("[pixel-ingest-dev] listening", { port: PORT, api_version: API_VERSION });
});
