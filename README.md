# GTM vs Measurement Protocol — Responsibility Split (Terra)

**Last updated:** 2026-02-26

This document reflects the **current, live architecture**.

Checkout tracking no longer flows through GTM.

---

## System Roles

| System | Responsibility | Data Source | Destination |
|---|---|---|---|
| **GTM** | forwards storefront events emitted by the Terra theme spine | Theme / dataLayer | GA4 (gtag) |
| **Shopify Checkout Pixel → pixel-ingest** | Checkout events | Shopify checkout runtime | GA4 (Measurement Protocol) |

There is a **hard separation** between storefront and checkout.

---

## GTM — What Must Remain

GTM forwards only storefront events emitted by the Terra theme spine:

- `terra_attribution_ready` — not a tracked event; pre-populates dataLayer  
- `terra_identity_ready` — not a tracked event; pre-populates dataLayer  
- `page_view` — custom page_view for GA4  
- `view_item` — ecommerce event forwarded to GA4  
- `view_item_list` — ecommerce event forwarded to GA4  
- `add_to_cart` — ecommerce event forwarded to GA4  
- `search` — currently satisfied via GA4 enhanced measurement (`view_search_results`); dedicated Terra producer may replace this for deterministic coverage  

These originate from the theme and dataLayer and are sent to GA4 via gtag from GTM.

---

## GTM — What Must Be Removed

The following **must not** exist in GTM:

- `checkout_started`  
- `add_shipping_info`  
- `add_payment_info`  
- `purchase`  

If these fire from GTM, GA4 will double-count against Measurement Protocol.

---

## Checkout Event Flow (Current)

**Source of truth:** Shopify Checkout runtime

**Flow:**

```text
Shopify Checkout Pixel
        ↓
pixel-ingest (Cloud Run)
        ↓
BigQuery raw.events_raw (append-only ledger)
        ↓
GA4 Measurement Protocol
```

## Checkout events handled exclusively by pixel-ingest

checkout_started
checkout_contact_info_submitted
checkout_address_info_submitted
checkout_shipping_info_submitted
payment_info_submitted
checkout_completed

These must never be emitted by GTM.

## Guardrails

To maintain Terra-grade integrity:

- Storefront events originate only from the theme spine
- GTM only forwards — it does not originate commerce truth
- Checkout events originate only from the Shopify checkout pixel
- pixel-ingest remains append-only and schema-stable

## GA4 receives:

- storefront events via gtag (GTM)
- checkout events via Measurement Protocol

Any deviation risks double-counting or identity breakage.
