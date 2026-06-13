import { Pool } from "pg";
import { env } from "@config/env";
import { logger } from "@shared/logger";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err) => {
  logger.error({ err }, "Unexpected pg pool error");
  process.exit(1);
});

export async function connectDB() {
  const client = await pool.connect();
  logger.info("Connected to the database");
  client.release();
}
