import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  doublePrecision,
} from "drizzle-orm/pg-core";

export const competitorsTable = pgTable("competitors", {
  id: serial("id").primaryKey(),
  handle: text("handle").notNull(),
  nicho: text("nicho").notNull(),
  followersApprox: integer("followers_approx"),
  notas: text("notas"),
  bio: text("bio"),
  engagementRateAvg: doublePrecision("engagement_rate_avg"),
  lastSynced: timestamp("last_synced"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Competitor = typeof competitorsTable.$inferSelect;

export const competitorReelsTable = pgTable("competitor_reels", {
  id: serial("id").primaryKey(),
  competitorId: integer("competitor_id")
    .notNull()
    .references(() => competitorsTable.id),
  url: text("url"),
  tema: text("tema").notNull(),
  hook: text("hook").notNull(),
  viewsApprox: integer("views_approx"),
  engagementLevel: text("engagement_level").notNull(),
  anguloDetectado: text("angulo_detectado"),
  transcripcion: text("transcripcion"),
  notas: text("notas"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type CompetitorReel = typeof competitorReelsTable.$inferSelect;
