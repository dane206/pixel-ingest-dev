// checkout-normalizer-v2_1.js

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

function normalizeCheckoutEcommerceV21(checkout) {
  if (!checkout) return null;

  const currency = checkout.currencyCode || null;
  const total = Number((checkout.totalPrice && checkout.totalPrice.amount) || 0);
  const shipping = Number(
    (checkout.shippingLine &&
      checkout.shippingLine.price &&
      checkout.shippingLine.price.amount) || 0
  );
  const tax = Number((checkout.totalTax && checkout.totalTax.amount) || 0);

  // Order-level coupon & discount
  let coupon = null;
  let discount = null;

  const apps = checkout.discountApplications || [];
  for (const app of apps) {
    if (app && app.type === "DISCOUNT_CODE" && app.title) {
      coupon = app.title;
      break;
    }
  }

  if (checkout.discountsAmount && checkout.discountsAmount.amount != null) {
    discount = Number(checkout.discountsAmount.amount); // e.g. 83.6
  }

  const items = [];
  const lineItems = checkout.lineItems || [];

  lineItems.forEach((li, idx) => {
    if (!li || !li.variant) return;

    const v = li.variant;
    const product = v.product || {};

    const productId = digits(product.id);
    const variantId = digits(v.id);
    if (!productId || !variantId) return;

    const sku = v.sku || "";
    const itemName = li.title || v.title || product.title || "";
    const itemVariant = v.title || "";
    const price = Number((v.price && v.price.amount) || 0);
    const quantity = li.quantity || 1;

    items.push({
      item_id: `shopify_US_${productId}_${variantId}`,
      item_group_id: `shopify_US_${productId}`,
      variant_id: String(variantId),
      sku: sku || undefined,
      item_name: itemName,
      item_brand: product.vendor || undefined,
      item_category: product.type || undefined,
      item_variant: itemVariant,
      currency: currency || undefined,
      price: price,
      quantity: quantity,
      index: idx + 1
    });
  });

  return {
    currency: currency || undefined,
    value: total,
    shipping: shipping,
    tax: tax,
    transaction_id: digits(checkout.order && checkout.order.id),
    item_list_id: null,
    item_list_name: null,
    coupon: coupon || "",                         // full-order coupon
    discount: discount != null ? discount : null, // total discount
    items: items
  };
}

/**
 * Normalizes the raw Shopify checkout pixel payload → Terra v2.1 event.
 * This is the "one true" Terra shape for checkout purchases.
 */
export function normalizeCheckoutPixelEventV21(body) {
  if (!body || body.data_source !== "shopify_checkout_pixel") return null;
  if (body.event_name !== "checkout_completed") return null;

  const raw = typeof body.raw === "string" ? JSON.parse(body.raw) : body.raw;
  if (!raw || raw.name !== "checkout_completed") return null;

  const checkout = raw && raw.data && raw.data.checkout;
  if (!checkout) return null;

  const attrs = attrsToObject(checkout.attributes || {});
  const identity = raw.identity || {};

  const th_vid =
    attrs.th_vid ||
    identity.visitor_id ||
    null;

  const session_key = attrs.session_key || null;
  const session_start = attrs.session_start || null;

  const ga4_client_id =
    attrs.ga4_client_id ||
    attrs.terra_ga_cid ||
    identity.ga_client_id ||
    null;

  const ga4_session_id =
    attrs.ga4_session_id ||
    attrs.terra_ga_sid ||
    null;

  let ga4_session_number =
    attrs.ga4_session_number ||
    attrs.terra_ga_sn ||
    null;
  if (ga4_session_number != null) ga4_session_number = Number(ga4_session_number);

  const terra_ft_source = attrs.terra_ft_source || null;
  const terra_ft_medium = attrs.terra_ft_medium || null;
  const terra_ft_campaign = attrs.terra_ft_campaign || null;
  const terra_ft_content = attrs.terra_ft_content || null;

  const terra_lt_source = attrs.terra_lt_source || null;
  const terra_lt_medium = attrs.terra_lt_medium || null;
  const terra_lt_campaign = attrs.terra_lt_campaign || null;
  const terra_lt_content = attrs.terra_lt_content || null;

  const orderId = digits(checkout.order && checkout.order.id) || (identity.transaction_id || null);
  const customerId =
    digits(checkout.order && checkout.order.customer && checkout.order.customer.id) ||
    identity.customer_id ||
    null;
  const isFirstOrder =
    checkout.order &&
    checkout.order.customer &&
    typeof checkout.order.customer.isFirstOrder === "boolean"
      ? checkout.order.customer.isFirstOrder
      : null;

  const ecommerce = normalizeCheckoutEcommerceV21(checkout);
  if (!ecommerce || !ecommerce.items || !ecommerce.items.length) return null;

  return {
    source: "shopify_checkout_pixel",
    schema_version: "terra_v2.1",
    event_name: "terra_purchase",
    event_id: body.event_id || raw.id || null,
    event_time: body.event_time || raw.timestamp || null,
    payload: {
      shopify_event: raw.name || body.event_name,

      // Identity / attribution
      th_vid: th_vid,
      session_key: session_key,
      session_start: session_start,
      ga4_client_id: ga4_client_id,
      ga4_session_id: ga4_session_id,
      ga4_session_number: ga4_session_number,

      terra_ft_source: terra_ft_source,
      terra_ft_medium: terra_ft_medium,
      terra_ft_campaign: terra_ft_campaign,
      terra_ft_content: terra_ft_content,
      terra_lt_source: terra_lt_source,
      terra_lt_medium: terra_lt_medium,
      terra_lt_campaign: terra_lt_campaign,
      terra_lt_content: terra_lt_content,

      // Order/customer
      checkout_id: checkout.token || null,
      order_id: orderId,
      customer_id: customerId,
      is_first_order: isFirstOrder,

      // Unified ecommerce v2.1
      ecommerce: ecommerce,

      // Full raw for debugging/future
      raw: raw
    }
  };
}