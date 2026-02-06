// ingest-handler.js

import express from "express";
import bodyParser from "body-parser";
import { normalizeCheckoutPixelEventV21 } from "./checkout-normalizer-v2_1.js";
import { sendTerraEventToGa4 } from "./ga4-writer.js";

const app = express();
app.use(bodyParser.json());

app.post("/v1/track", async (req, res) => {
  const body = req.body;

  // 1) Always log/store raw event for debugging / BQ
  // await writeToBigQueryRaw(body);

  // 2) Normalize checkout → Terra v2.1 (if applicable)
  const terraEvent = normalizeCheckoutPixelEventV21(body);

  if (terraEvent) {
    // 2a) Store Terra v2.1 event for analytics
    // await writeToBigQueryTerraEvent(terraEvent);

    // 2b) Send to GA4 via MP
    await sendTerraEventToGa4(terraEvent);
  } else {
    console.log("[ingest] No terra_v2.1 event produced (may be non-checkout or unsupported).");
  }

  res.status(204).send();
});

// Export app for Cloud Run
export default app;