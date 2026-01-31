# Raw Event Ingest — SSOT

**Last updated:** 2026-01-30

DEV VERIFIED: GA4 + BigQuery raw schema validated on 2026-01-20

This document is the **single source of truth** for the raw event ingestion pipeline. It replaces:

* `DEPLOYED_DEV.md`
* `RAW_EVENT_PIPELINE_LOCK.md`

If something is not documented here, it is **not guaranteed**.

* local: `/Users/dane/projects/pixel-ingest-dev`
* repo: `https://github.com/dane206/pixel-ingest-dev`

---

## Service: pixel-ingest-dev

**Status:** Active

### Identity

* **Platform:** Cloud Run (managed)
* **Project:** terra-analytics-dev
* **Region:** us-central1
* **Service URL:** [https://pixel-ingest-dev-600339193870.us-central1.run.app](https://pixel-ingest-dev-600339193870.us-central1.run.app)

### Role

Canonical **development** raw ingest service.

This service exists solely to provide a **durable, lossless landing zone** for browser-originated events (Shopify Custom Pixel, theme JS, manual tests).

It enforces the SSOT contract by **not** interpreting or mutating data.

---

## Endpoint Contract

* **POST** `v1//track`
* **Response:** `204 No Content` (always)

### Request Shapes

The endpoint accepts **exactly one** of the following:

* A single event object
* An array of event objects
* `{ "events": [...] }`

Each event results in **one appended row** in BigQuery.

---

## Ingest Guarantees (Non-Negotiable)

`pixel-ingest-dev`:

* Is public
* Requires **no authentication**
* Is CORS-enabled
* Never blocks callers
* Never returns errors to callers
* Never retries on behalf of callers
* Never filters events
* Never enriches events
* Never interprets meaning
* Never deduplicates

Its only job is **raw durability**.

---

## BigQuery Destination (RAW)

* **Project:** terra-analytics-dev
* **Dataset:** raw_dev
* **Table:** events_raw

### Write Semantics

* Append-only
* At-least-once delivery
* No updates
* No deletes
* No backfills

No analytics, dashboards, or business logic may depend directly on this table.

---

## Column Contract (RAW)

Each row contains:

* `received_at` (TIMESTAMP)
  Server-side ingestion time. Always populated.

* `data_source` (STRING)
  Identifies the producing system (e.g. `shopify_web_pixel`, `manual`).

* `event_name` (STRING)
  Caller-provided label. Not normalized here.

* `event_id` (STRING)
  Caller-provided unique identifier. Used downstream for deduplication.

* `event_time` (TIMESTAMP, NULLABLE)
  Client-reported timestamp. Untrusted.

* `raw` (STRING)
  Full JSON payload, stringified **exactly as received**.

Schema stability is more important than naming perfection.

---

## Explicit Non-Goals

Attribution (FT/LT) is intentionally out of scope for the raw ingest + identity context layer; if present, it is caller-provided and treated as opaque.

The RAW ingest layer does **not**:

* Define truth
* Enforce schemas
* Normalize naming
* Deduplicate
* Create identity
* Create analytics facts
* Guarantee correctness
* Guarantee completeness

All meaning is created **downstream**.

---

## Downstream Responsibility

All of the following belong outside the raw layer (e.g. `stg_dev` and later):

* JSON parsing
* Validation
* Canonicalization
* Deduplication
* Identity stitching
* Sessionization
* Attribution
* Analytics modeling

---

## Environment Variables (Locked)

Set at deploy-time and must not be inferred from code defaults:

* `BQ_DATASET=raw_dev`
* `BQ_TABLE=events_raw`

---

## Verification

### Test Insert

```bash
curl -X POST https://pixel-ingest-dev-600339193870.us-central1.run.app/v1/track \
  -H "content-type: application/json" \
  -d '{"event_name":"ping","event_id":"verify-001","data_source":"manual"}'
```

### Verify in BigQuery

```sql
SELECT *
FROM `terra-analytics-dev.raw_dev.events_raw`
ORDER BY received_at DESC
LIMIT 5;
```

---

## Status

**LIVE**

This pipeline is **LOCKED**. Any change requires:

* A documented reason
* A new table or new service
* An explicit migration plan

Do not modify this service casually.
