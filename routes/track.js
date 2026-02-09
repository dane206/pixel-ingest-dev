import insertBQ from "../lib/bq.js";
import { forwardCheckoutToGA4 } from "../integrations/ga4.js";

export default async function trackRoute(req, res) {
  console.log("=== TRACK ROUTE ENTERED ===");

  try {
    const body = req.body || {};

    const events = Array.isArray(body?.events)
      ? body.events
      : Array.isArray(body)
        ? body
        : [body];

    const rows = [];

    // ✅ ALWAYS store EXACT event as received
    for (let i = 0; i < events.length; i++) {
      const ev = events[i] || {};

      rows.push({
        received_at: new Date().toISOString(),
        data_source: ev.data_source || "unknown",
        event_name: ev.event_name || null,
        event_id: ev.event_id ? String(ev.event_id) : null,
        event_time: ev.event_time || null,
        raw: ev
      });
    }

    await insertBQ(rows);
    console.log("BQ INSERT SUCCESS");

    // ✅ GA4 forwarding is NOT part of storage
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];

      if (ev.data_source !== "shopify_checkout_pixel") continue;

      try {
        await forwardCheckoutToGA4(ev);
      } catch (e) {
        console.error("GA4 forward failed:", e.message);
      }
    }

    res.status(200).end();
  } catch (err) {
    console.error(
      "🚨 TRACK ROUTE ERROR:",
      JSON.stringify(err, Object.getOwnPropertyNames(err), 2)
    );
    res.status(500).json({ error: err.message });
  }
}