import {
  pgTable,
  serial,
  text,
  integer,
  real,
  timestamp,
  date,
} from "drizzle-orm/pg-core";

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

export type AccountSnapshot = typeof accountSnapshotsTable.$inferSelect;

export const strategicDirectiveTable = pgTable("strategic_directive", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type StrategicDirective = typeof strategicDirectiveTable.$inferSelect;
