#!/usr/bin/env bash
set -e

SERVICE="pixel-ingest-dev"
REGION="us-central1"

echo "Deploying $SERVICE to $REGION..."

gcloud run deploy "$SERVICE" \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --env-vars-file env.pixel-ingest-dev.yaml

echo "Done."