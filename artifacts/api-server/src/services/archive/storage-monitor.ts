import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

const ARCHIVE_THRESHOLD_PERCENT = 90;

export async function getDatabaseStorageUsage() {
  const result = await db.execute(sql`
    SELECT
      pg_database_size(current_database()) AS database_bytes,
      current_database() AS database_name
  `);

  const row = result.rows[0] as {
    database_bytes: string | number;
    database_name: string;
  };

  const databaseBytes = Number(row.database_bytes);

  return {
    databaseName: row.database_name,
    databaseBytes,
    databaseMb: Number((databaseBytes / 1024 / 1024).toFixed(2)),
    archiveThresholdPercent: ARCHIVE_THRESHOLD_PERCENT,
  };
}
