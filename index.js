import express from "express";

const app = express();
app.disable("x-powered-by");

app.use(
  express.json({
    limit: "256kb",
    type: ["application/json", "text/plain"]
  })
);

const COLLECTOR_URL =
  "https://terra-collector-dev-600339193870.us-central1.run.app/track";

const COLLECTOR_SECRET = process.env.COLLECTOR_SECRET;

if (!COLLECTOR_SECRET) {
  console.error("Missing COLLECTOR_SECRET");
  process.exit(1);
}

app.post("/track", async (req, res) => {
  try {
    const body = req.body || {};

    if (!body.event_id || !body.event_name || !body.timestamp) {
      return res.status(204).end();
    }

    const forward = {
      event_id: body.event_id,
      event_name: body.event_name,
      payload: body.payload || body.data || {},
      session_key: body.session_key || null,
      session_start: body.session_start || null,
      source: "shopify_pixel",
      th_vid: body.th_vid || null,
      timestamp: body.timestamp
    };

    await fetch(COLLECTOR_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-terra-secret": COLLECTOR_SECRET
      },
      body: JSON.stringify(forward)
    });

    return res.status(204).end();
  } catch (err) {
    console.error("PIXEL PROXY ERROR", err);
    return res.status(204).end();
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("pixel proxy listening on", PORT);
});
