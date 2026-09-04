import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

const id = () => uuid("id").defaultRandom().primaryKey();

export const archiveBatchesTable = pgTable("autobiz_archive_batches", {
  id: id(),
  businessId: uuid("business_id"),
  sourceTable: text("source_table").notNull(),
  status: text("status").notNull().default("prepared"),
  cutoffAt: timestamp("cutoff_at", { withTimezone: true }).notNull(),
  rowCount: integer("row_count").notNull().default(0),
  payloadBytes: integer("payload_bytes").notNull().default(0),
  checksumSha256: text("checksum_sha256"),
  storageProvider: text("storage_provider").notNull().default("google_drive"),
  storageObjectId: text("storage_object_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  errorMessage: text("error_message"),
});

export type ArchiveBatch = typeof archiveBatchesTable.$inferSelect;
export type InsertArchiveBatch = typeof archiveBatchesTable.$inferInsert;
