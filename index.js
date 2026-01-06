import express from "express";

const app = express();
app.disable("x-powered-by");

/* =========================================================
   pixel-ingest-dev (PUBLIC PROXY) — FINAL
   ---------------------------------------------------------
   - Browser / Shopify Pixel calls this endpoint
   - CORS handled here (collector never exposed to browser)
   - Forwards server-to-server to terra-collector-dev
   - Secret REQUIRED server-side only
   - ALWAYS returns 204 to browser (never blocks checkout)
========================================================= */

/* =========================
   CORS (MUST be first)
   - Shopify Pixel may send Origin: null (sandboxed iframe)
   - Reflect real origins
   - Treat "null" / missing origin as public
========================= */
app.use(function (req, res, next) {
  var origin = req.get("origin"); // may be "null" or undefined

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
   Config
========================= */
const COLLECTOR_URL =
  process.env.COLLECTOR_URL ||
  "https://terra-collector-dev-600339193870.us-central1.run.app/track";

const COLLECTOR_SECRET = process.env.COLLECTOR_SECRET;
const IS_PROD = process.env.NODE_ENV === "production";

if (!COLLECTOR_SECRET) {
  console.error("[pixel-ingest-dev] Missing COLLECTOR_SECRET");
  process.exit(1);
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

/* =========================
   Track endpoint (proxy)
========================= */
app.post("/track", async function (req, res) {
  // Contract: browser ALWAYS gets 204
  try {
    var body = req.body || {};

    // Minimal validation only — pixel must stay resilient
    if (
      !isNonEmptyString(body.event_id) ||
      !isNonEmptyString(body.event_name) ||
      !isNonEmptyString(body.timestamp)
    ) {
      if (!IS_PROD) {
        console.log("[pixel-ingest-dev] inbound invalid", {
          has_event_id: !!body.event_id,
          has_event_name: !!body.event_name,
          has_timestamp: !!body.timestamp
        });
      }
      res.status(204).end();
      return;
    }

    // DEV-only inbound visibility (sanitized)
    if (!IS_PROD) {
      console.log("[pixel-ingest-dev] inbound", {
        event_name: body.event_name,
        event_id: body.event_id,
        timestamp: body.timestamp,
        payload_keys: body.payload
          ? Object.keys(body.payload).slice(0, 20)
          : []
      });
    }

    var forward = {
      event_id: body.event_id,
      event_name: body.event_name,
      timestamp: body.timestamp,
      source: "shopify_pixel",

      // Identity is PASS-THROUGH ONLY
      th_vid: body.th_vid || null,
      session_key: body.session_key || null,
      session_start: body.session_start || null,

      payload: body.payload || body.data || {}
    };

    // Server-to-server forward (secret NEVER exposed to browser)
    var r = await fetch(COLLECTOR_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-terra-secret": COLLECTOR_SECRET
      },
      body: JSON.stringify(forward)
    });

    if (!IS_PROD) {
      console.log("[pixel-ingest-dev] forwarded", {
        status: r.status,
        ok: r.ok
      });
    }

    res.status(204).end();
  } catch (err) {
    if (!IS_PROD) {
      console.error(
        "[pixel-ingest-dev] proxy error",
        err && err.message ? err.message : err
      );
    }
    res.status(204).end();
  }
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
  console.log("[pixel-ingest-dev] listening", {
    port: PORT,
    collector_url: COLLECTOR_URL,
    env: process.env.NODE_ENV || "unset"
  });
});
