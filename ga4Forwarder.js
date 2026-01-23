// ga4Forwarder.js

const fetch = require("node-fetch");

const GA4_MEASUREMENT_ID = process.env.GA4_MEASUREMENT_ID;
const GA4_API_SECRET     = process.env.GA4_API_SECRET;

function digits(x) {
  return String(x || "").replace(/\D/g, "");
}

function buildItems(checkout) {
  const out = [];
  const lines = checkout.lineItems || [];

  for (const li of lines) {
    if (!li || !li.variant) continue;

    const productId = digits(li.variant.product && li.variant.product.id);
    const variantId = digits(li.variant.id);
    if (!productId || !variantId) continue;

    out.push({
      item_id: `shopify_US_${productId}_${variantId}`,
      item_name: li.title || "",
      price: Number(li.variant.price && li.variant.price.amount),
      quantity: li.quantity || 1
    });
  }

  return out;
}

async function sendMP(clientId, name, params) {
  if (!clientId) return;

  await fetch(
    `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`,
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

async function forwardCheckoutToGA4(raw) {
  const checkout = raw?.data?.checkout;
  if (!checkout) return;

  const clientId = raw?.clientId; // comes from Shopify pixel context
  if (!clientId) return;

  const items = buildItems(checkout);
  if (!items.length) return;

  const base = {
    currency: checkout.currencyCode,
    value: Number(checkout.totalPrice?.amount),
    items
  };

  switch (raw.name) {
    case "checkout_started":
      await sendMP(clientId, "begin_checkout", base);
      break;

    case "checkout_shipping_info_submitted":
      await sendMP(clientId, "add_shipping_info", base);
      break;

    case "payment_info_submitted":
      await sendMP(clientId, "add_payment_info", base);
      break;

    case "checkout_completed":
      await sendMP(clientId, "purchase", {
        ...base,
        transaction_id: digits(checkout.order && checkout.order.id)
      });
      break;
  }
}

module.exports = { forwardCheckoutToGA4 };
