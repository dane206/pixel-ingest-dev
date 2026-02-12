import { BigQuery } from "@google-cloud/bigquery";

const bq = new BigQuery({
  projectId: process.env.BQ_PROJECT
});

const DATASET = process.env.BQ_DATASET;
const TABLE = process.env.BQ_TABLE;

if (!process.env.BQ_PROJECT) throw new Error("Missing BQ_PROJECT");
if (!process.env.BQ_DATASET) throw new Error("Missing BQ_DATASET");
if (!process.env.BQ_TABLE) throw new Error("Missing BQ_TABLE");

console.log("BQ CONFIG LOCKED:");
console.log("PROJECT:", process.env.BQ_PROJECT);
console.log("DATASET:", process.env.BQ_DATASET);
console.log("TABLE:", process.env.BQ_TABLE);

export default async function insertBQ(rows) {
  console.log("BQ PROJECT:", bq.projectId);
  console.log("BQ DATASET:", DATASET);
  console.log("BQ TABLE:", TABLE);

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