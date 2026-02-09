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

    // ✅ ALWAYS store EXACT event object (never ev.raw)
    for (let i = 0; i < events.length; i++) {
      const ev = events[i] || {};

      rows.push({
        received_at: new Date().toISOString(),
        data_source: ev.data_source || "unknown",
        event_name: ev.event_name || null,
        event_id: ev.event_id ? String(ev.event_id) : null,
        event_time: ev.event_time || null,
        raw: ev          // ← CRITICAL: always the full event
      });
    }

    await insertBQ(rows);

    // ✅ Only checkout pixel goes to GA4
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