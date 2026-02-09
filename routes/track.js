import insertBQ from "../lib/bq.js";
import { forwardCheckoutToGA4 } from "../integrations/ga4.js";

export default async function trackRoute(req, res) {
  try {
    const body = JSON.parse(JSON.stringify(req.body || {}));  // ← THE REAL FIX

    const events = Array.isArray(body?.events)
      ? body.events
      : Array.isArray(body)
        ? body
        : [body];

    const rows = [];

    // ✅ ALWAYS store EXACT event object (never ev.raw)
	for (let i = 0; i < events.length; i++) {
	  const ev = events[i] || {};
	
	  // 🔥 THIS is the real fix
	  const clean = JSON.parse(JSON.stringify(ev));
	
	  delete clean["gtm.uniqueEventId"];
	
	  rows.push({
		received_at: new Date().toISOString(),
		data_source: clean.data_source || "unknown",
		event_name: clean.event_name || null,
		event_id: clean.event_id ? String(clean.event_id) : null,
		event_time: clean.event_time || null,
		raw: clean
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