import express from "express";
import trackRouteV2 from "./routes/track.js";

const app = express();
app.disable("x-powered-by");

app.use(function (req, _res, next) {
  console.log("[pixel-ingest-dev]", req.method, req.path);
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
app.post("/v1/track", trackRouteV2); // legacy path
app.post("/v2/track", trackRouteV2); // new path you will test
app.post("/track", trackRouteV2);    // back-compat

app.get("/health", function (_req, res) {
  res.status(200).send("ok");
});

/* Boot */

const PORT = Number(process.env.PORT || 8080);
app.listen(PORT, function () {
  console.log("[pixel-ingest-dev] listening", { port: PORT });
});
