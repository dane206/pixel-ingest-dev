import express from "express";
import trackRouteV2 from "./routes/track.js";
import { ensureRawEventsTable } from "./adapters/bigquery.adapter.js";

const app = express();
app.disable("x-powered-by");

/* Logging */
app.use(function (req, _res, next) {
  console.log("[pixel-ingest]", req.method, req.path);
  next();
});

/* CORS */
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

/* Body parsing */
app.use(
  express.json({
    limit: "5mb",
    type: ["application/json", "text/plain"]
  })
);

/* Routes */
app.post("/v2/track", trackRouteV2);

app.get("/health", function (_req, res) {
  res.status(200).send("ok");
});

const PORT = Number(process.env.PORT || 8080);

/* BOOT — schema enforced before server starts */
async function boot() {
  try {
    await ensureRawEventsTable();

    app.listen(PORT, function () {
      console.log("[pixel-ingest] listening", { port: PORT });
      console.log("[pixel-ingest] server started.");
    });

  } catch (err) {
    console.error("❌ BOOT FAILED:", err);
    process.exit(1);
  }
}

boot();
