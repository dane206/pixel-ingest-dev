import { BigQuery } from "@google-cloud/bigquery";

const bq = new BigQuery();

const DATASET = process.env.BQ_DATASET;
const TABLE = process.env.BQ_TABLE;

export default async function insertBQ(rows) {
  await bq
    .dataset(DATASET)
    .table(TABLE)
    .insert(rows, { ignoreUnknownValues: true });
}