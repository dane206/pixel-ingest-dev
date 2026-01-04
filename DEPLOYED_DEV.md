# DEPLOYED (DEV) — pixel-ingest-dev

Service: pixel-ingest-dev  
Revision: pixel-ingest-dev-00028-9qp  
Base URL: https://pixel-ingest-dev-7ak5xlux7q-uc.a.run.app  
Endpoint: /track

## Role
Public proxy for Shopify Custom Pixel events.

- Accepts unauthenticated POSTs from browser/pixel
- Does NOT require or check any secret from caller
- Forwards events server-to-server to terra-collector-dev
- Adds `x-terra-secret` internally via env var

## Environment
- COLLECTOR_SECRET (required)

## Expected behavior
- POST /track without secret → 204
- POST /track with secret → 204 (ignored)

## Health check
curl -i https://pixel-ingest-dev-7ak5xlux7q-uc.a.run.app/track \
  -H "content-type: application/json" \
  --data-raw '{"event_id":"t","event_name":"t","timestamp":"2026-01-04T00:00:00Z","payload":{"ok":true}}'
