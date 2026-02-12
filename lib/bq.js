import { BigQuery } from "@google-cloud/bigquery";
import schema from "./schema_raw_events.json" assert { type: "json" };

const bigquery = new BigQuery();

const DATASET = "raw";
const TABLE = "events_raw";

export async function ensureRawEventsTable() {
  const dataset = bigquery.dataset(DATASET);
  const table = dataset.table(TABLE);

  const [exists] = await table.exists();

  if (!exists) {
    console.log("[bq] Creating events_raw table...");
    await dataset.createTable(TABLE, { schema });
    console.log("[bq] Table created.");
    return;
  }

  console.log("[bq] Verifying schema...");

  const [metadata] = await table.getMetadata();
  const current = metadata.schema.fields;

  if (JSON.stringify(current) !== JSON.stringify(schema)) {
    console.error("❌ SCHEMA MISMATCH DETECTED");
    console.error("Current:", current);
    console.error("Expected:", schema);
    process.exit(1);
  }

  console.log("[bq] Schema verified.");
}

export { bigquery };