import { pool } from "./config/database.js";
import { demoService } from "./services/demo.service.js";

try {
  const result = await demoService.bootstrapCanonicalData();
  if (result.bootstrapped) {
    console.log("Seed complete. User IDs:", result.userIds.join(", "));
  } else {
    console.log("Seed skipped — canonical data already present.");
  }
} catch (error) {
  console.error("Seeding failed:", error);
  process.exit(1);
} finally {
  await pool.end();
}
