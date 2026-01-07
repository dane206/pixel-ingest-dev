## 🔒 `RAW_EVENT_PIPELINE_LOCK.md` (FULL REPLACEMENT)

This document defines the **non-negotiable contract** for raw event ingestion.
Changes require explicit justification and coordinated migration.

---

## Architecture (DEV)

Browser (Theme JS + Shopify Custom Pixel)
→ pixel-ingest-dev (public, CORS, unauthenticated, always 204)
→ BigQuery raw_dev.events_raw

---

## pixel-ingest-dev — HARD RULES

- Public endpoint
- No authentication
- No secrets required from caller
- Always returns 204
- Never blocks, retries, or errors to caller
- Never filters events
- Never interprets payload meaning
- Never creates or mutates identity
- Never deduplicates
- Never enriches
- Writes raw events only

---

## BigQuery RAW LAYER — HARD RULES

Dataset: raw_dev  
Table: events_raw

- Append-only
- No updates
- No deletes
- No backfills here
- No analytics queries should depend on this table
- Payload is stored as STRING JSON
- Schema stability > naming perfection

---

## Column Semantics (RAW)

- received_at  
  Server-side ingestion time. Always populated.

- event_time  
  Client-reported event time. Nullable. Untrusted.

- event_id  
  Caller-provided unique identifier. Used for downstream dedupe.

- event_name  
  Caller-provided label. Not normalized here.

- data_source  
  Identifies producer system (NOT traffic source).

- raw  
  Full payload exactly as received (stringified JSON).

---

## Explicit Non-Goals

The RAW layer does NOT:
- define truth
- enforce schemas
- normalize naming
- deduplicate
- create analytics facts
- guarantee completeness of identity
- guarantee correctness of event_time

Meaning is created downstream.

---

## Downstream Responsibility

All of the following belong in `stg_dev` or later:
- Parsing raw JSON
- Normalizing event names
- Enforcing canonical time semantics
- Deduplication
- Identity stitching
- Sessionization
- Attribution
- Analytics modeling

---

## Status

LOCKED  
Any change to this pipeline requires:
- documented reason
- new table or new service
- explicit migration plan

Last locked: 2026-01-07
