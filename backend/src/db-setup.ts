import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "../migrations");
const files = (await readdir(migrationsDir)).filter((file) => file.endsWith(".sql")).sort();
const client = new pg.Client({ connectionString: databaseUrl });

await client.connect();
try {
  for (const file of files) {
    await client.query(await readFile(join(migrationsDir, file), "utf8"));
    console.log(`Applied ${file}`);
  }
} finally {
  await client.end();
}
