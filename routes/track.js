import insertBQ from "../lib/bq.js";
import { forwardCheckoutToGA4 } from "../integrations/ga4.js";

/* Track handler */
export default async function trackRoute(req, res) {
  var body = req.body;
  var events;

  if (Array.isArray(body && body.events)) {
    events = body.events;
  } else if (Array.isArray(body)) {
    events = body;
  } else if (body) {
    events = [body];
  } else {
    events = [];
  }

  var receivedAtIso = new Date().toISOString();

  try {
    if (events.length) {
      var rows = [];

      for (var i = 0; i < events.length; i++) {
        var ev = events[i] || {};

        var eventTime = null;
        if (ev.event_time || ev.timestamp) {
          eventTime = new Date(ev.event_time || ev.timestamp);
        }

        rows.push({
          received_at: new Date(receivedAtIso),
          data_source: ev.data_source || ev.source || "unknown",
          event_name: ev.event_name || ev.event || null,
          event_id: ev.event_id || null,
          event_time: eventTime,
          raw: JSON.parse(JSON.stringify(ev, function (_k, v) {
            return v === undefined ? null : v;
          }))
        });
      }

      // Write raw ledger
      await insertBQ(rows);

      // Forward to GA4
      for (var j = 0; j < events.length; j++) {
        var ev2 = events[j] || {};

        var raw =
          typeof ev2.raw === "string"
            ? JSON.parse(ev2.raw)
            : ev2.raw;

        var checkout = raw && raw.data && raw.data.checkout;

        if (checkout) {
          await forwardCheckoutToGA4(ev2, checkout);
        }
      }
    }
  } catch (err) {
    console.error("[trackRoute] error", err);
  }

  res.status(204).end();
}