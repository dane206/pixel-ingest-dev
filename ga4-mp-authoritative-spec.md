For the GA4 / Shopify / Measurement Protocol parts of your system, every line should map directly to vendor documentation. 
No invention, no interpretation.
These are the exact sources your Node (Cloud Run) file must follow.

---

## 1) GA4 Measurement Protocol (authoritative spec)

**What defines your `/mp/collect` body, event names, params, session stitching**

**Docs**

* [https://developers.google.com/analytics/devguides/collection/protocol/ga4](https://developers.google.com/analytics/devguides/collection/protocol/ga4)
* [https://developers.google.com/analytics/devguides/collection/protocol/ga4/reference/events](https://developers.google.com/analytics/devguides/collection/protocol/ga4/reference/events)
* [https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events](https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events)
* [https://developers.google.com/analytics/devguides/collection/protocol/ga4/validating-events](https://developers.google.com/analytics/devguides/collection/protocol/ga4/validating-events)

From here comes:

* `client_id`
* `events: [{ name, params }]`
* `begin_checkout`, `add_shipping_info`, `add_payment_info`, `purchase`
* `items[]` structure
* `session_id`
* `session_number`
* `engagement_time_msec`
* `transaction_id`
* `currency`, `value`

Nothing in your MP payload should exist that is not in these docs.

---

## 2) GA4 Ecommerce `items[]` schema (why your canonical item looks the way it does)

**Docs**

* [https://developers.google.com/analytics/devguides/collection/ga4/ecommerce](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce)

This is why you have:

* `item_id`
* `item_name`
* `item_brand`
* `item_category…`
* `item_variant`
* `price`
* `quantity`
* `coupon`
* `discount`
* `item_list_id`
* `item_list_name`

Your `shopify_US_<product>_<variant>` format comes from Google’s required uniqueness for `item_id`.

---

## 3) Shopify Web Pixel → checkout payload shape

**This defines what exists in `ev.raw.data.checkout`**

**Docs**

* [https://shopify.dev/docs/api/web-pixels-api/standard-events/checkout_started](https://shopify.dev/docs/api/web-pixels-api/standard-events/checkout_started)
* [https://shopify.dev/docs/api/web-pixels-api/standard-events/checkout_completed](https://shopify.dev/docs/api/web-pixels-api/standard-events/checkout_completed)
* [https://shopify.dev/docs/api/web-pixels-api/standard-events/payment_info_submitted](https://shopify.dev/docs/api/web-pixels-api/standard-events/payment_info_submitted)
* [https://shopify.dev/docs/api/web-pixels-api](https://shopify.dev/docs/api/web-pixels-api)

This is why your Node code must read:

```
ev.raw.data.checkout.lineItems
ev.raw.data.checkout.attributes
ev.raw.data.checkout.noteAttributes
```

Because Shopify defines it that way.

---

## 4) Shopify cart attributes → checkout attributes bridge

**Why `04-terra-checkout-bridge` works**

**Docs**

* [https://shopify.dev/docs/api/ajax/reference/cart#update-cart-attributes](https://shopify.dev/docs/api/ajax/reference/cart#update-cart-attributes)
* [https://shopify.dev/docs/themes/architecture/templates/cart#cart-attributes](https://shopify.dev/docs/themes/architecture/templates/cart#cart-attributes)
* [https://shopify.dev/docs/api/liquid/objects/checkout#checkout-attributes](https://shopify.dev/docs/api/liquid/objects/checkout#checkout-attributes)

This is why:

```
fetch("/cart/update.js", { body: { attributes }})
```

shows up later in:

```
checkout.attributes
```

This is not custom. This is Shopify’s documented behavior.

---

## 5) Why GA4 stitching requires `_ga` and `_ga_<stream>`

**Docs**

* [https://support.google.com/analytics/answer/11397207](https://support.google.com/analytics/answer/11397207)
* [https://developers.google.com/analytics/devguides/collection/ga4/cookies-user-id](https://developers.google.com/analytics/devguides/collection/ga4/cookies-user-id)

This is why SSOT reads:

* `_ga` → client_id
* `_ga_<stream>` → session id / session number

Without this, MP events will **never** join the browser session.

---

## 6) Why event names at edge must be GA4 native

**Docs**

* [https://developers.google.com/analytics/devguides/collection/ga4/reference/events#begin_checkout](https://developers.google.com/analytics/devguides/collection/ga4/reference/events#begin_checkout)

This is why:

```
checkout_started → begin_checkout
```

is not a design choice. It is required by GA4.

---

## 7) Why `dataLayer` must exist before events fire (GTM spec)

**Docs**

* [https://developers.google.com/tag-platform/tag-manager/web/datalayer](https://developers.google.com/tag-platform/tag-manager/web/datalayer)

This is why `window.dataLayer = window.dataLayer || []` must exist before pushes.

---

## What this means

Your Node file, your SSOT, your checkout bridge, your item builder — every one of them is **derivable directly from the docs above**.

If a line cannot be traced to one of those links, it does not belong in the system.

That is the standard you are asking for. And it is correct.
