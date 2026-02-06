// ga4-writer.js

import fetch from "node-fetch";

const MID = process.env.GA4_MEASUREMENT_ID;
const SECRET = process.env.GA4_API_SECRET;

function mapTerraToGa4Name(terraEventName) {
  // Here terra_purchase is the only one we're mapping to "purchase".
  // If you later add terra_begin_checkout, etc., extend this.
  switch (terraEventName) {
    case "terra_purchase": return "purchase";
    default: return null;
  }
}

export async function sendTerraEventToGa4(terraEvent) {
  if (!MID || !SECRET) {
    console.log("[ga4-mp] Missing GA4_MEASUREMENT_ID or GA4_API_SECRET");
    return;
  }

  if (!terraEvent || terraEvent.schema_version !== "terra_v2.1") {
    console.log("[ga4-mp] Unsupported terra schema_version:", terraEvent && terraEvent.schema_version);
    return;
  }

  const ga4Name = mapTerraToGa4Name(terraEvent.event_name);
  if (!ga4Name) {
    console.log("[ga4-mp] Unsupported terra event_name:", terraEvent.event_name);
    return;
  }

  const p = terraEvent.payload || {};
  const ecom = p.ecommerce || {};

  const clientId = p.ga4_client_id;
  if (!clientId) {
    console.log("[ga4-mp] ❌ NO CLIENT ID in Terra event");
    return;
  }

  const thVid = p.th_vid || undefined;
  const isPurchase = ga4Name === "purchase";

  const params = {
    currency: ecom.currency,
    value: ecom.value,
    items: Array.isArray(ecom.items) ? ecom.items : [],

    engagement_time_msec: 1,

    session_id: p.ga4_session_id != null ? Number(p.ga4_session_id) : undefined,
    session_number: p.ga4_session_number != null ? Number(p.ga4_session_number) : undefined,

    transaction_id: isPurchase ? ecom.transaction_id : undefined,
    shipping: isPurchase ? ecom.shipping : undefined,
    tax: isPurchase ? ecom.tax : undefined,

    coupon: ecom.coupon || undefined,
    discount: ecom.discount != null ? ecom.discount : undefined,

    event_id: terraEvent.event_id
  };

  // Attach Terra identifiers as custom GA4 params
  if (p.terra_ft_source) params.terra_ft_source = p.terra_ft_source;
  if (p.terra_ft_medium) params.terra_ft_medium = p.terra_ft_medium;
  if (p.terra_ft_campaign) params.terra_ft_campaign = p.terra_ft_campaign;
  if (p.terra_ft_content) params.terra_ft_content = p.terra_ft_content;
  if (p.terra_lt_source) params.terra_lt_source = p.terra_lt_source;
  if (p.terra_lt_medium) params.terra_lt_medium = p.terra_lt_medium;
  if (p.terra_lt_campaign) params.terra_lt_campaign = p.terra_lt_campaign;
  if (p.terra_lt_content) params.terra_lt_content = p.terra_lt_content;
  if (p.is_first_order != null) params.is_first_order = p.is_first_order;

  const payload = {
    client_id: String(clientId),
    user_id: thVid || undefined,
    timestamp_micros: Date.now() * 1000,
    events: [
      {
        name: ga4Name,
        params: params
      }
    ]
  };

  console.log("[ga4-mp] SENDING\n", JSON.stringify(payload, null, 2));

  const url =
    `https://www.google-analytics.com/debug/mp/collect` +
    `?measurement_id=${encodeURIComponent(MID)}` +
    `&api_secret=${encodeURIComponent(SECRET)}`;

  const r = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  const text = await r.text();
  console.log("[ga4-mp] RESPONSE\n", text);
}