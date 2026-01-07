# DEPLOYED (DEV) — pixel-ingest-dev

## Service
- Name: pixel-ingest-dev
- Platform: Cloud Run (managed)
- Region: us-central1
- Project: terra-analytics-dev
- Service URL: https://pixel-ingest-dev-600339193870.us-central1.run.app

## Endpoint
- POST /track
- Response: 204 No Content (always)

## Role
Public raw ingest endpoint for browser-originated events (Shopify Custom Pixel, theme JS, manual tests).

This service:
- Accepts unauthenticated POST requests
- Is CORS-enabled
- NEVER blocks callers
- NEVER mutates or interprets payloads
- Writes raw events directly to BigQuery

## BigQuery Destination
- Project: terra-analytics-dev
- Dataset: raw_dev
- Table: events_raw

## Insert Contract
Each incoming request may contain:
- a single event object
- an array of event objects
- `{ events: [...] }`

Each event is written as **one row**.

Columns written:
- received_at (TIMESTAMP) — server ingestion time
- data_source (STRING) — producer identifier (e.g. shopify_web_pixel, manual)
- event_name (STRING)
- event_id (STRING)
- event_time (TIMESTAMP, nullable)
- raw (STRING) — full JSON payload (stringified)

## Environment Variables (LOCKED)
- BQ_DATASET=raw_dev
- BQ_TABLE=events_raw

These are set at deploy-time and must not be inferred from code defaults.

## Guarantees
- Append-only
- At-least-once delivery
- Payload preservation
- No schema enforcement beyond raw durability

## Verification
Example health insert:

```bash
curl -X POST https://pixel-ingest-dev-600339193870.us-central1.run.app/track \
  -H "content-type: application/json" \
  -d '{"event_name":"ping","event_id":"verify-001","data_source":"manual"}'
```

## Verify in BigQuery:

```sql
SELECT *
FROM `terra-analytics-dev.raw_dev.events_raw`
ORDER BY received_at DESC
LIMIT 5;
```

## Status:
DEPLOYED AND LIVE
Last verified: 2026-01-07