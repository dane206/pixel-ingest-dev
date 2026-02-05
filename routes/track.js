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

      // 1. Write raw ledger - FIRST
      await insertBQ(rows);

      // 2. Forward ONLY checkout events to GA4 - SECOND
      for (var j = 0; j < events.length; j++) {
        var ev2 = events[j] || {};

        var checkout =
  		  ev2 &&
  		  ev2.data &&
  		  ev2.data.checkout;

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