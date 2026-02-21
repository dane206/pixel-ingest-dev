import { BigQuery } from "@google-cloud/bigquery";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const schema = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../schemas/raw-events.bq.json"),
    "utf8"
  )
);

const bigquery = new BigQuery();

const DATASET = "raw";
const TABLE = "events_raw";

/* ---------- INSERT FUNCTION ---------- */

export default async function insertBQ(rows) {
  if (!rows || !rows.length) return;

  await bigquery
    .dataset(DATASET)
    .table(TABLE)
    .insert(rows);
}

/* ---------- SCHEMA ENFORCEMENT ---------- */

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
    process.exit(1);
  }

  console.log("[bq] Schema verified.");
}