import app from "./app";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

async function runMigrations() {
  try {
    await db.execute(sql`ALTER TABLE reels ADD COLUMN IF NOT EXISTS transcripcion TEXT`);
    await db.execute(sql`ALTER TABLE competitor_reels ADD COLUMN IF NOT EXISTS transcripcion TEXT`);
    logger.info("Startup migrations complete");
  } catch (e) {
    logger.warn({ err: e }, "Startup migration warning (columns may already exist)");
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

runMigrations().then(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
});
