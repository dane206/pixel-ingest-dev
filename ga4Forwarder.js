import fetch from "node-fetch";

const MID = process.env.GA4_MEASUREMENT_ID;
const SECRET = process.env.GA4_API_SECRET;

function digits(x) {
  return String(x || "").replace(/\D/g, "");
}

function attrsToObject(arr) {
  if (!Array.isArray(arr)) return {};
  const o = {};
  for (const a of arr) {
    if (a && a.key) o[a.key] = a.value;
  }
  return o;
}

function buildItems(checkout) {
  const items = [];
  for (const li of checkout.lineItems || []) {
    if (!li?.variant) continue;

    const productId = digits(li.variant.product?.id);
    const variantId = digits(li.variant.id);
    if (!productId || !variantId) continue;

    items.push({
      item_id: `shopify_US_${productId}_${variantId}`,
      item_name: li.title || "",
      price: Number(li.variant.price?.amount),
      quantity: li.quantity || 1
    });
  }
  return items;
}

function ga4Name(shopifyName) {
  switch (shopifyName) {

    case "checkout_started":
      return "begin_checkout";

    case "checkout_shipping_info_submitted":
      return "add_shipping_info";

    case "payment_info_submitted":
      return "add_payment_info";

    case "checkout_completed":
      return "purchase";

    default:
      return null;
  }
}

export async function forwardCheckoutToGA4(ev) {
  if (!MID || !SECRET) return;

  const name = ga4Name(ev.event_name);
  if (!name) return;

  const raw = typeof ev.raw === "string" ? JSON.parse(ev.raw) : ev.raw;
  const checkout = raw?.data?.checkout;
  if (!checkout) return;

  const attrs = attrsToObject(
    checkout.attributes || checkout.noteAttributes
  );

  const clientId =
	attrs.ga4_client_id ||
	attrs.terra_ga_cid ||
	raw?.clientId ||
	null;
  if (!clientId) return;
	
  const sessionId =
	attrs.ga4_session_id ||
	attrs.terra_ga_sid ||
	null;
	
  const sessionNumber =
	attrs.ga4_session_number ||
	attrs.terra_ga_sn ||
	null;

const items = buildItems(checkout);
if (!items.length) return;

let params;

switch (name) {

  case "begin_checkout":
    params = {
      currency: checkout.currencyCode,
      value: Number(checkout.subtotalPrice?.amount),
      items
    };
    break;

  case "add_shipping_info":
    params = {
      currency: checkout.currencyCode,
      value: Number(checkout.subtotalPrice?.amount),
      items,
      shipping_tier:
        checkout.delivery?.selectedDeliveryOptions?.[0]?.title || undefined
    };
    break;

  case "add_payment_info":
    params = {
      currency: checkout.currencyCode,
      value: Number(checkout.subtotalPrice?.amount),
      items,
      payment_type:
        checkout.transactions?.[0]?.paymentMethod?.type || undefined
    };
    break;

  case "purchase":
    params = {
      currency: checkout.currencyCode,
      value: Number(checkout.totalPrice?.amount),
      items,
      transaction_id: digits(checkout.order?.id)
    };
    break;

  default:
    return;
}

params.engagement_time_msec = 1;

if (sessionId) params.session_id = Number(sessionId);
if (sessionNumber) params.session_number = Number(sessionNumber);

if (!clientId) return;

await fetch(
  `https://www.google-analytics.com/mp/collect?measurement_id=${MID}&api_secret=${SECRET}`,
  {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      events: [{ name, params }]
    })
  }
);
}
