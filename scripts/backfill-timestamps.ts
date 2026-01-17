import dotenv from "dotenv";
dotenv.config();

import { MongoClient } from "mongodb";

function getDbNameFromUri(uri: string): string {
  try {
    const u = new URL(uri);
    const raw = (u.pathname || "").replace(/^\//, "");
    return raw || "studio";
  } catch {
    return "studio";
  }
}

async function run() {
  const uri = process.env.DATABASE_URL;
  if (!uri) {
    console.error("DATABASE_URL não encontrada no .env");
    process.exit(1);
  }

  const dbName = getDbNameFromUri(uri);
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const now = new Date();

  const collectionsWithBoth = ["Service", "Barber", "Booking", "Product"];
  const collectionsOnlyCreated = ["StockMove"];

  for (const coll of collectionsWithBoth) {
    const c = db.collection(coll);
    const r1 = await c.updateMany({ createdAt: { $exists: false } }, { $set: { createdAt: now } });
    const r2 = await c.updateMany({ updatedAt: { $exists: false } }, { $set: { updatedAt: now } });
    console.log(`[${coll}] createdAt preenchidos: ${r1.modifiedCount}, updatedAt preenchidos: ${r2.modifiedCount}`);
  }

  for (const coll of collectionsOnlyCreated) {
    const c = db.collection(coll);
    const r1 = await c.updateMany({ createdAt: { $exists: false } }, { $set: { createdAt: now } });
    console.log(`[${coll}] createdAt preenchidos: ${r1.modifiedCount}`);
  }

  await client.close();
  console.log("Backfill finalizado com sucesso.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
