#!/usr/bin/env bash
set -e

ENV=$1

if [ "$ENV" == "dev" ]; then
  SERVICE="pixel-ingest-dev"
  PROJECT="terra-analytics-dev"
  ENV_FILE="env.pixel-ingest-dev.yaml"
elif [ "$ENV" == "prod" ]; then
  SERVICE="pixel-ingest-prod"
  PROJECT="terra-analytics-prod"
  ENV_FILE="env.pixel-ingest-prod.yaml"
else
  echo "Usage: ./deploy.sh [dev|prod]"
  exit 1
fi

REGION="us-central1"

echo "Deploying $SERVICE to $PROJECT ($REGION) using $ENV_FILE..."

gcloud run deploy "$SERVICE" \
  --source . \
  --region "$REGION" \
  --project "$PROJECT" \
  --allow-unauthenticated \
  --env-vars-file "$ENV_FILE"

echo "Done."