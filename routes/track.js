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
        received_at: new Date().toISOString(),   // ✅ ISO only
        data_source: ev.data_source || "unknown",
        event_name: ev.event_name || null,
        event_id: ev.event_id ? String(ev.event_id) : null,  // ← THIS
        event_time: ev.event_time || null,      // ✅ pass through
        raw: JSON.stringify(ev)
      });
    }

    console.log("ABOUT TO INSERT BQ:", rows.length);
    await insertBQ(rows);
    console.log("BQ INSERT SUCCESS");

    for (let i = 0; i < events.length; i++) {
	  const ev = events[i];
	
	  const checkout = ev?.raw?.data?.checkout;
	
	  if (!checkout) {
		console.log("NO CHECKOUT FOUND IN RAW");
		continue;
	  }
	
	  console.log("CHECKOUT FOUND → FORWARDING TO GA4");
	  await forwardCheckoutToGA4(ev, checkout);
	}

    res.status(200).end();
  } catch (err) {
    console.error(
  	  "🚨 BQ INSERT FULL ERROR:",
  	  JSON.stringify(err, Object.getOwnPropertyNames(err), 2)
	);
    res.status(500).json({ error: err.message });
  }
}