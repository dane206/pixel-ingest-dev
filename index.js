import express from "express";
import { BigQuery } from "@google-cloud/bigquery";

const app = express();
app.disable("x-powered-by");

/* =========================
   CORS (must be first)
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
const DATASET = "raw_dev";
const TABLE = "events_raw";

/* =========================
   Track endpoint (RAW)
========================= */
app.post("/track", async function (req, res) {
  try {
    const body = req.body || {};

    const row = {
  		received_at: new Date().toISOString(),
  		source: body.source || "unknown",
  		event_id: body.event_id || null,
  		event_name: body.event_name || null,
  		payload: JSON.stringify(body.payload || body.data || body || {}),
  		session_key: body.session_key || null,
  		session_start: body.session_start || null,
  		th_vid: body.th_vid || null,
  		timestamp: body.timestamp || null
	};

    await bq
      .dataset(DATASET)
      .table(TABLE)
      .insert([row]);
  } catch (err) {
    // RAW must never block
    console.error("[pixel-ingest-dev] insert error", err.message);
  }

  // Contract: ALWAYS 204
  res.status(204).end();
});

/* =========================
   Health
========================= */
app.get("/healthz", function (_req, res) {
  res.status(200).send("ok");
});

/* =========================
   Boot
========================= */
const PORT = Number(process.env.PORT || 8080);
app.listen(PORT, function () {
  console.log("[pixel-ingest-dev] listening", { port: PORT });
});
