import { BigQuery } from "@google-cloud/bigquery";

const bq = new BigQuery();

/* BigQuery (RAW ledger) required env vars */
const DATASET = process.env.BQ_DATASET;
const TABLE = process.env.BQ_TABLE;

if (!DATASET || !TABLE) {
  throw new Error("Missing required env vars: BQ_DATASET and/or BQ_TABLE");
}

export default async function insertBQ(rows) {
  try {
    await bq.dataset(DATASET).table(TABLE).insert(rows, {
      ignoreUnknownValues: false,
      skipInvalidRows: false
    });
  } catch (err) {
    if (err.name === "PartialFailureError" && Array.isArray(err.errors)) {
      for (const e of err.errors) {
        console.error(
          "[pixel-ingest-dev] bq row error",
          JSON.stringify(e.errors, null, 2),
          "row:",
          JSON.stringify(e.row, null, 2)
        );
      }
    } else {
      console.error("[pixel-ingest-dev] bq error", err);
    }
    throw err;
  }
}