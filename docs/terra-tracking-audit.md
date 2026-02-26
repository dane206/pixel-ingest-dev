Below is the **exact layered model of the Terra tracking system as it exists (and should exist)**. This is not theory — it maps directly to your stack.

Read it top → bottom. Each layer has a distinct job.

---

# 🧱 Layer 0 — User Interaction (Reality Layer)

**What it is:**
The human browsing and buying on your Shopify store.

**Examples:**

* views product
* clicks collection
* adds to cart
* completes checkout

**You do not control this layer.**
Everything else exists to observe it accurately.

**Status:** always present.

---

# 🧱 Layer 1 — Event Producers (Instrumentation Layer)

These are the systems that **emit events**.

## In your stack

### ✅ Shopify theme events

(JS in theme / Liquid snippets)

Fires things like:

* view_item
* view_item_list
* add_to_cart
* terra_identity_ready
* terra_attribution_ready

---

### ✅ Shopify Web Pixel (storefront)

Fires Shopify customer events such as:

* page_viewed
* product_viewed
* etc.

---

### ✅ Shopify Checkout Pixel

Fires checkout events:

* checkout_started
* checkout_shipping_info_submitted
* checkout_completed

---

**Responsibility of this layer**

* detect behavior
* package event payload
* include ctx + identity
* send to collector

**Status in your system:** working.

---

# 🧱 Layer 2 — Transport Layer (Network Hop)

**What it is:**
The POST from browser → your collector.

Example:

```id="nhtlkt"
POST /v2/track
```

This layer should be:

* fast
* reliable
* stateless

You generally don’t modify data here.

**Status:** working.

---

# 🧱 Layer 3 — Ingestion Service (Collector)

## Your service

```id="qdgk1d"
pixel-ingest-dev / pixel-ingest-prod (Cloud Run)
```

**Its ONLY job:**

* accept payload
* lightly envelope
* write to BigQuery
* return 204

### Critical rule (you already adopted)

> no business logic
> no reshaping
> no normalization

This is correct.

---

## Output of this layer

Writes to:

```id="pq1x7h"
raw.events_raw
```

---

**Status:** correct and frozen (good decision).

---

# 🧱 Layer 4 — Raw Ledger (Ground Truth)

## Your table

```id="k35jhm"
raw.events_raw
```

This is your **forensic source of truth**.

Each row contains:

* data_source
* event_name
* event_id
* event_time
* raw (full payload)

---

## Purpose

* replayability
* auditability
* loss prevention
* future reprocessing

---

## Critical rule

> NEVER mutate raw
> NEVER “fix” raw
> NEVER depend on raw being clean

You are following this.

**Status:** solid.

---

# 🧱 Layer 5 — Terra Normalization Layer (Intelligence Layer)

⚠️ This is the layer that is **partially formed** in your system.

This is where:

* identity spine is enforced
* items are canonicalized
* list context is cleaned
* naming is harmonized (eventually)
* schema becomes analytics-ready

---

## Components that belong here

Examples in your ecosystem:

* `shopifyFormatItem()`
* GA4 forwarder mapping
* BigQuery transformation models
* Terra canonical views/tables

---

## Output of this layer (conceptually)

Clean, consistent Terra events such as:

* normalized ecommerce items
* consistent identity
* analytics-ready tables

---

**Status:** in progress (this is where you’re actively working).

---

# 🧱 Layer 6 — Activation & Destinations

Systems that **consume** the cleaned data.

## In your stack

### ✅ GA4

Used for:

* funnel visibility
* attribution
* audiences

---

### ✅ Google Ads

Used for:

* conversion optimization
* remarketing

---

### ✅ BigQuery marts / analysis

Used for:

* LTV
* cohorts
* profitability
* ML (future)

---

**Status:** working but still being hardened.

---

# 🧱 Layer 7 — Analytics & Modeling (Business Intelligence)

This is the top of the pyramid.

Where you ultimately want to live:

* cohort analysis
* LTV curves
* CAC payback
* creative performance
* predictive models

You already started:

* BigQuery marts
* R pipelines
* Shiny dashboard plans

---

**Status:** early but viable.

---

# 🔎 Why you felt confused

Because Layers 4–6 are currently blurred in your implementation.

Specifically:

* raw is solid
* producers are solid
* normalization is mid-build
* naming is hybrid

This creates cognitive noise even though the foundation is good.

---

# 🎯 The simplified mental model

If you remember nothing else, remember this:

```id="n6gqka"
User behavior
   ↓
Producers fire events
   ↓
pixel-ingest collects (dumb pipe)
   ↓
raw.events_raw stores truth
   ↓
Terra layer cleans & standardizes
   ↓
GA4 / Ads / BI consume
```

You are **past the hard infrastructure phase** and now in the **discipline & normalization phase**.

---

# ✅ Bottom line

You DO have a real system.

Your layer maturity:

* Layers 0–4: strong
* Layer 5: actively being hardened
* Layer 6: functional
* Layer 7: emerging

Nothing fundamental is missing.

---

If you want maximum clarity, the highest-value next step is:

**“Map my actual files into these layers.”**

That will remove the remaining fog completely.
terra-tracking-auditability