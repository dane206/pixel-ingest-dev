import fetch from "node-fetch";

const MID = process.env.GA4_MEASUREMENT_ID;
const SECRET = process.env.GA4_API_SECRET;

/* ================== UTILS ================== */

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

/* ================== FULL GA4 ITEM SCHEMA ================== */

function buildItems(checkout) {
  const items = [];

  for (const li of checkout.lineItems || []) {
    if (!li || !li.variant) continue;

    const productId = digits(
      li.variant.product && li.variant.product.id
    );

    const variantId = digits(li.variant.id);
    if (!productId || !variantId) continue;

    items.push({
      item_id: `shopify_US_${productId}_${variantId}`,
      item_group_id: `shopify_US_${productId}`,
      variant_id: String(variantId),
      sku: li.variant.sku || "",

      item_name: li.title || "",
      affiliation: "shopify_web_store",
      currency: checkout.currencyCode,
      price: Number(li.variant.price && li.variant.price.amount),
      quantity: li.quantity || 1,

      coupon: "",
      discount: 0,
      index: 1,

      item_brand:
        (li.variant.product && li.variant.product.vendor) || "",
      item_category:
        (li.variant.product && li.variant.product.type) || "",
      item_category2: "",
      item_category3: "",
      item_category4: "",
      item_category5: "",

      item_list_id: "",
      item_list_name: "",
      item_variant: li.variant.title || "",

      location_id: "",
      creative_name: "",
      creative_slot: "",
      promotion_id: "",
      promotion_name: ""
    });
  }

  return items;
}

/* ================== SHOPIFY → GA4 MAP ================== */

function mapName(n) {
  switch (n) {
    case "checkout_started": return "begin_checkout";
    case "checkout_shipping_info_submitted": return "add_shipping_info";
    case "payment_info_submitted": return "add_payment_info";
    case "checkout_completed": return "purchase";
    default: return null;
  }
}

/* ================== FORWARDER ================== */

export async function forwardCheckoutToGA4(ev) {
  if (!MID || !SECRET) return;

  const name = mapName(ev.event_name);
  if (!name) return;

  /*
    CRITICAL:
    ev.raw is already the Shopify event object.
    DO NOT parse.
    DO NOT unwrap.
  */
  const raw = ev.raw || {};

  const checkout =
    raw.data &&
    raw.data.checkout;

  if (!checkout) {
    console.log("[ga4-mp] ❌ NO CHECKOUT IN RAW");
    return;
  }

  const attrs = attrsToObject(checkout.attributes || []);

  const clientId =
    attrs.ga4_client_id ||
    attrs.terra_ga_cid ||
    attrs._ga ||
    undefined;

  if (!clientId) {
    console.log("[ga4-mp] ❌ NO CLIENT ID IN ATTRS");
    return;
  }

  const sessionId =
    attrs.ga4_session_id ||
    attrs.terra_ga_sid ||
    undefined;

  const sessionNumber =
    attrs.ga4_session_number ||
    attrs.terra_ga_sn ||
    undefined;

  const items = buildItems(checkout);
  if (!items.length) {
    console.log("[ga4-mp] ❌ NO ITEMS");
    return;
  }

  /* ================== GA4 PARAMS ================== */

  const value =
    name === "purchase"
      ? Number(
          (checkout.totalPrice &&
           checkout.totalPrice.amount) || 0
        )
      : Number(
          (checkout.subtotalPrice &&
           checkout.subtotalPrice.amount) || 0
        );

  const params = {
    currency: checkout.currencyCode,
    value,
    items,
    engagement_time_msec: 1,

    session_id: sessionId ? Number(sessionId) : undefined,
    session_number: sessionNumber
      ? Number(sessionNumber)
      : undefined,

    transaction_id:
      (checkout.order && checkout.order.id)
        ? String(checkout.order.id)
        : String(checkout.token),

    event_id: ev.event_id,
    debug_mode: 1
  };

  const payload = {
    client_id: clientId,
    user_id: ev.user_id || undefined,
    timestamp_micros: Date.now() * 1000,
    events: [{ name, params }]
  };

  console.log("[ga4-mp] SENDING\n", JSON.stringify(payload, null, 2));

  const r = await fetch(
    `https://www.google-analytics.com/mp/collect?measurement_id=${MID}&api_secret=${SECRET}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    }
  );

  const text = await r.text();
  console.log("[ga4-mp] RESPONSE\n", text);
}