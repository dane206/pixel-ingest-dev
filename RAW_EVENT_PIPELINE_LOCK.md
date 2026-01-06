# RAW EVENT PIPELINE — LOCKED

Architecture:
Browser (Theme + Shopify Pixel)
→ pixel-ingest-dev (public, CORS, no auth, always 204)
→ terra-collector-dev (private, x-terra-secret required)
→ BigQuery raw tables

Principles:
- Raw capture only
- No filtering in browser
- No identity creation in proxy
- Identity may be null on early events
- Noise is expected and preserved
- Meaning is created downstream

Status:
LOCKED — DO NOT MODIFY WITHOUT EXPLICIT REASON
