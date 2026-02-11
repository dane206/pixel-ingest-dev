import insertBQ from "../lib/bq.js";
import { forwardCheckoutToGA4 } from "../integrations/ga4.js";

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

      /*
        CRITICAL:
        ev.raw is already the Shopify event object.
        DO NOT parse.
        DO NOT stringify.
      */

      const rawObject = ev.raw || {};

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
	  raw: rawObject
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

    res.status(200).end();
  } catch (err) {
    console.error("TRACK ROUTE ERROR:", err);
    res.status(500).end();
  }
}