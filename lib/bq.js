import { BigQuery } from "@google-cloud/bigquery";

const bq = new BigQuery();

const DATASET = process.env.BQ_DATASET;
const TABLE = process.env.BQ_TABLE;

export default async function insertBQ(rows) {
  try {
    await bq
      .dataset(DATASET)
      .table(TABLE)
      .insert(rows, { ignoreUnknownValues: true });

  } catch (err) {
    console.error("BQ FULL ERROR:", JSON.stringify(err, null, 2));
    throw err;
  }
}