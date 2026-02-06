import insertBQ from "../lib/bq.js";
import { forwardCheckoutToGA4 } from "../integrations/ga4.js";

export default async function trackRoute(req, res) {
  console.log("=== TRACK ROUTE ENTERED ===");

  try {
    const body = req.body || {};
    console.log("BODY:", Object.keys(body));

    const events = Array.isArray(body?.events)
      ? body.events
      : Array.isArray(body)
        ? body
        : [body];

    console.log("EVENT COUNT:", events.length);

    const rows = [];

    for (let i = 0; i < events.length; i++) {
      const ev = events[i] || {};

      rows.push({
        received_at: new Date(),
        data_source: ev.data_source || "unknown",
        event_name: ev.event_name || null,
        event_id: ev.event_id || null,
        event_time: ev.event_time ? new Date(ev.event_time) : null,
        raw: ev
      });
    }

    console.log("ABOUT TO INSERT BQ:", rows.length);
    await insertBQ(rows);
    console.log("BQ INSERT SUCCESS");

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      const checkout = ev?.data?.checkout;

      if (checkout) {
        console.log("FORWARDING TO GA4");
        await forwardCheckoutToGA4(ev, checkout);
        console.log("GA4 FORWARD SUCCESS");
      }
    }

    res.status(200).end();
  } catch (err) {
    console.error("🚨 BQ OR GA4 FAILURE:", err);
    res.status(500).json({ error: err.message });
  }
}