import express from "express";

const app = express();
app.disable("x-powered-by");

/* =========================
   CORS (MUST be first)
   - Always return headers
   - Always 204 OPTIONS (no auth)
========================= */
app.use(function (req, res, next) {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-methods", "POST, OPTIONS");
  res.setHeader(
    "access-control-allow-headers",
    "content-type, x-terra-secret"
  );

  // Optional: reduce preflight frequency
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

if (!COLLECTOR_SECRET) {
  console.error("Missing COLLECTOR_SECRET");
  process.exit(1);
}

/* =========================
   Helpers
========================= */

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

/* =========================
   Track endpoint (proxy)
========================= */

app.post("/track", async (req, res) => {
  try {
    var body = req.body || {};

	// Treat malformed events as no-op (keeps pixel resilient)
    if (
      !isNonEmptyString(body.event_id) ||
      !isNonEmptyString(body.event_name) ||
      !isNonEmptyString(body.timestamp)
    ) {
      res.status(204).end();
      return;
    }

    var forward = {
      event_id: body.event_id,
      event_name: body.event_name,
      payload: body.payload || body.data || {},
      session_key: body.session_key || null,
      session_start: body.session_start || null,
      source: "shopify_pixel",
      th_vid: body.th_vid || null,
      timestamp: body.timestamp
    };
    
	// Forward to your collector using server-side secret
    await fetch(COLLECTOR_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-terra-secret": COLLECTOR_SECRET
      },
      body: JSON.stringify(forward)
    });

    res.status(204).end();
  } catch (err) {
    console.error("PIXEL PROXY ERROR", err);
    res.status(204).end();
  }
});

/* =========================
   Health
========================= */

app.get("/healthz", function (_req, res) {
  res.status(200).send("ok");
});

const PORT = Number(process.env.PORT || 8080);
app.listen(PORT, function () {
  console.log("[terra-collector-dev] pixel proxy listening on", PORT);
});
