import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const client = new pg.Pool({ connectionString: databaseUrl, max: 1 });

try {
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  console.log("Migrations applied successfully");
} catch (error) {
  console.error("Migration failed:", error);
  process.exit(1);
} finally {
  await client.end();
}
