import insertBQ from "../adapters/bigquery.adapter.js";
import { forwardCheckoutToGA4 } from "../adapters/ga4.adapter.js";

export default async function trackRoute(req, res) {
  try {
    const body = req.body || {};

    const events = Array.isArray(body?.events)
      ? body.events
      : Array.isArray(body)
        ? body
        : [body];

    const rows = [];

    for (let i = 0; i < events.length; i++) {
      const ev = events[i] || {};

      let rawObject = ev.raw;
      
      // unwrap nested envelope if present
      if (
        rawObject &&
        typeof rawObject === "object" &&
        rawObject.raw &&
        typeof rawObject.raw === "object"
      ) {
        rawObject = rawObject.raw;
      }

      // ensure we always have an object
      if (!rawObject || typeof rawObject !== "object") {
        rawObject = {
          _terra_raw_error: true,
          received_type: typeof ev.raw
        };
      }

      // Optional: remove GTM noise safely
      if (rawObject && rawObject["gtm.uniqueEventId"]) {
        delete rawObject["gtm.uniqueEventId"];
      }

	  rows.push({
	    received_at: new Date(),
	    data_source: ev.data_source || "unknown",
	    event_name: ev.event_name || null,
	    event_id: ev.event_id ? String(ev.event_id) : null,
	    event_time: ev.event_time ? new Date(ev.event_time) : null,
	    raw: JSON.stringify(rawObject)
	  });
    }

    await insertBQ(rows);

    // Only forward checkout pixel to GA4
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      if (ev.data_source !== "shopify_checkout_pixel") continue;

      try {
        await forwardCheckoutToGA4(ev);
      } catch (_) {}
    }

    // 204 is cleaner for collectors
    res.status(204).end();
  } catch (err) {
    console.error("TRACK ROUTE ERROR:", err);
    res.status(500).end();
  }
}