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
    console.log("[bq] creating events_raw table...");
    await dataset.createTable(TABLE, { schema });
    console.log("[bq] table created.");
    return;
  }

  console.log("[bq] verifying schema...");

  const [metadata] = await table.getMetadata();
  const current = metadata.schema.fields;

  if (JSON.stringify(current) !== JSON.stringify(schema)) {
    console.error("❌ SCHEMA MISMATCH DETECTED");
    console.error("current:", current);
    console.error("expected:", schema);
    process.exit(1);
  }

  console.log("[bq] schema verified.");
}

export { bigquery };