# Terra Identity

## Resulting identity stack (ideal for Terra)

## Per event you would have:
	1. `th_vid` → Terra visitor (primary)
	2. `shopify_client_id` → Shopify browser id (secondary)
	3. `terra_ga_cid` → GA client id (transport)
	4. `shopify_user_id` → authenticated user (when known)

## That is a best-in-class identity graph.



### `th_vid` → Terra visitor (primary); `shopify_client_id` → Shopify browser id (secondary); `terra_ga_cid` → GA client id (transport); `shopify_user_id` → authenticated user (when known)

You’re right to demand the **100% master contract**.
No hedging. No theory. No drift.

Below is the **final, literal, DRY, production-ready Terra master structure** — the exact file tree and responsibility boundaries that remove ambiguity and fix your identity + ctx issues permanently.

This is the contract your system should implement and QA against.

---

# ✅ TERRA MASTER PLAN — FINAL (LOCK THIS)

## Layer model (authoritative)

There are **5 layers total**:

```
L0 — Transport & Queue
L1 — Attribution bootstrap
L2 — Identity SSOT
L3 — Event producers
L4 — Checkout bridge
```

Nothing else belongs in theme.

---

# 🧱 FILE TREE — LITERAL TARGET STATE

This is what your Shopify theme **must converge to**.

```
/snippets
  ├── 00-terra-gtm-loader.liquid          ← L0 transport
  ├── 01-terra-attribution-ready.liquid   ← L1 attribution
  ├── 02-terra-identity-ssot.liquid       ← L2 identity
  ├── 03-terra-item-utils.liquid          ← shared utils
  ├── 04-terra-page-view-producer.liquid  ← L3 producer
  ├── 05-terra-view-item-producer.liquid
  ├── 06-terra-add-to-cart-producer.liquid
  ├── 07-terra-view-item-list-collection.liquid
  ├── 08-terra-view-item-list-search.liquid
  └── 09-terra-checkout-bridge.liquid     ← L4 checkout
```

### 🚨 Important corrections vs your current state

You currently have drift:

**PROD**

* missing page_view producer
* checkout bridge mis-numbered

**DEV**

* numbering collision at 04
* inconsistent ordering

👉 The tree above is the **only correct canonical order**.

---

# 🔒 LAYER RESPONSIBILITIES (NON-NEGOTIABLE)

## L0 — Transport

`00-terra-gtm-loader.liquid`

**Owns ONLY:**

* dataLayer init
* terraPushEvent
* queue buffering
* GTM load

**NEVER:**

* identity logic
* attribution logic
* page context
* Shopify data

---

## L1 — Attribution

`01-terra-attribution-ready.liquid`

**Produces exactly one event:**

```
terra_attribution_ready
```

**Owns:**

* UTM parsing
* click IDs
* cookie persistence
* terra_ft_*
* terra_lt_*

**Does NOT know:**

* customer
* session
* page type
* products

---

## L2 — Identity SSOT

`02-terra-identity-ssot.liquid`

This is your **most critical file**.

**Produces exactly one event:**

```
terra_identity_ready
```

**Owns:**

* th_vid generation (once per browser)
* session_key
* session_start
* ctx_id generation
* device_type
* iso_week
* GA cookie mirroring
* page context
* customer detection

---

### ✅ REQUIRED OUTPUT VARIABLES (LOCK THESE)

Every downstream event depends on these existing:

```
ctx_version
ctx_id
th_vid
session_key
session_start
terra_ga_cid
terra_ga_sid
terra_ga_sn
device_type
iso_week
page_location
page_path
page_title
page_referrer
page_type
terra_ft_*
terra_lt_*
```

If any of these are missing → your funnel breaks.

---

# ⭐ SPECIAL EVENT — AUTH STATE

Still inside **L2**, conditionally emit:

```
terra_user_authenticated
```

**ONLY when:**

```
Shopify customer exists
AND shopify_user_id present
```

This is NOT optional long-term for your identity graph.

---

# 📄 L3 — Event Producers

These are **pure behavioral emitters**.

They MUST:

* wait for identity
* call terraPushEvent
* include full ctx
* include full ecommerce when applicable

---

## Required producers

### Page

```
04-terra-page-view-producer.liquid
→ emits terra_page_view
```

---

### Product

```
05-terra-view-item-producer.liquid
→ emits terra_view_item
```

---

### Cart

```
06-terra-add-to-cart-producer.liquid
→ emits terra_add_to_cart
```

---

### Lists

```
07-terra-view-item-list-collection.liquid
08-terra-view-item-list-search.liquid
→ emits terra_view_item_list
```

---

# 🧾 L4 — Checkout Bridge

```
09-terra-checkout-bridge.liquid
```

**Purpose:**

Copy identity → checkout attributes.

This is what makes your checkout pixel look like:

```
ctx_id: populated
th_vid: populated
session_key: populated
terra_ga_cid: populated
```

Your second payload already proves this works.

---

# 🔐 COOKIE WRITER — HARD RECOMMENDATION

Your safe writer is **correct and should be kept**.

But tighten one thing.

## ✅ KEEP — identity always-write list

This is correct:

```
th_vid
session_key
terra_ga_cid
terra_ga_sid
terra_ga_sn
```

## 🔥 ADD (important)

You must ALSO always-write:

```
ctx_id
```

Because your entire SSOT depends on it.

---

## ✅ FINAL ALWAYS_WRITE (LOCK THIS)

```js
var ALWAYS_WRITE = {
  th_vid: true,
  session_key: true,
  session_start: true,
  ctx_id: true,
  terra_ga_cid: true,
  terra_ga_sid: true,
  terra_ga_sn: true
};
```

This is the hard production recommendation.

---

# 🧠 INGESTION CONTRACT (FINAL)

You asked repeatedly. Here is the resolved answer.

## ✅ ONE TABLE ONLY

```
raw.events_raw
```

Everything goes here.

---

## Schema (locked)

```
received_at      TIMESTAMP
data_source      STRING
event_name       STRING
event_id         STRING
event_time       TIMESTAMP
raw              JSON   ← STRUCT (not string)
```

**Final answer:** use **JSON/STRUCT**, not string.

Your pipeline is mature enough. Stop debating this.

---

# 🚨 WHY YOUR COUNTS LOOK “WRONG”

Your numbers:

```
checkout_started: 461
checkout_completed: 503
```

This is **expected in Shopify reality** because:

* checkout_completed includes:

  * Shop Pay resumes
  * accelerated flows
  * restored checkouts
  * server-side completions

It is NOT a bug.

---

# ✅ WHAT YOU ARE ACTUALLY MISSING (THE REAL FINAL 5%)

Based on everything you showed:

## Must verify

### 1. ctx_id never null in storefront events

(your earlier payload showed null)

### 2. checkout bridge writes ctx attributes

### 3. terra_user_authenticated fires when logged in

### 4. page_view producer exists in PROD

### 5. raw column is JSON not string

That is the real finish line.

---

# 🧭 Bottom line

You are **extremely close**.

You do NOT need:

* renaming spree
* schema overhaul
* new identity model
* event prefix migration

You need:

* structural discipline
* final file parity
* cookie hardening
* ingestion lock

---

## If you want the final step

Say:

> "Generate the locked production versions of each snippet"

…and I will output **copy-paste final code** for every file in the canonical tree.
