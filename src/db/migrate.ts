import fs from "fs";
import path from "path";
import { pool } from "./pool";
import { logger } from "@shared/logger";

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id        SERIAL PRIMARY KEY,
        filename  TEXT NOT NULL UNIQUE,
        run_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const { rows } = await client.query<{ filename: string }>(
      "SELECT filename FROM _migrations ORDER BY id",
    );
    const ran = new Set(rows.map((r) => r.filename));

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (ran.has(file)) {
        logger.debug({ file }, "Already run, skipping");
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO _migrations (filename) VALUES ($1)", [
          file,
        ]);
        await client.query("COMMIT");
        logger.info({ file }, "Migration applied");
      } catch (err) {
        await client.query("ROLLBACK");
        logger.error({ err, file }, "Migration failed, rolled back");
        process.exit(1);
      }
    }

    logger.info("All migrations complete");
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
