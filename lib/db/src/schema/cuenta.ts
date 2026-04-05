import {
  pgTable,
  serial,
  text,
  integer,
  real,
  timestamp,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const accountSnapshotsTable = pgTable("account_snapshots", {
  id: serial("id").primaryKey(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  views: integer("views").notNull(),
  followersGained: integer("followers_gained").notNull(),
  profileVisits: integer("profile_visits").notNull(),
  conversionPct: real("conversion_pct").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertAccountSnapshotSchema = createInsertSchema(
  accountSnapshotsTable,
).omit({ id: true, createdAt: true });
export type InsertAccountSnapshot = z.infer<
  typeof insertAccountSnapshotSchema
>;
export type AccountSnapshot = typeof accountSnapshotsTable.$inferSelect;

export const strategicDirectiveTable = pgTable("strategic_directive", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertStrategicDirectiveSchema = createInsertSchema(
  strategicDirectiveTable,
).omit({ id: true, createdAt: true });
export type InsertStrategicDirective = z.infer<
  typeof insertStrategicDirectiveSchema
>;
export type StrategicDirective = typeof strategicDirectiveTable.$inferSelect;
