export default async function insertBQ(rows) {
  const table = bq.dataset(DATASET).table(TABLE);

  const [metadata] = await table.getMetadata();
  console.log("BQ ACTUAL TABLE:", metadata.tableReference);
  console.log("BQ ACTUAL SCHEMA:", metadata.schema);
  console.log("INSERTING INTO:", `${bq.projectId}.${DATASET}.${TABLE}`);

  // 🔥 Convert raw object → string BEFORE insert
  const safeRows = rows.map(r => ({
    ...r,
    raw: typeof r.raw === "string"
      ? r.raw
      : JSON.stringify(r.raw || {})
  }));

  try {
    await table.insert(safeRows, { ignoreUnknownValues: true });
  } catch (err) {
    console.error("BQ FULL ERROR:", JSON.stringify(err, null, 2));
    throw err;
  }
}