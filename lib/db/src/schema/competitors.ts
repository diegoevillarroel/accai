import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const competitorsTable = pgTable("competitors", {
  id: serial("id").primaryKey(),
  handle: text("handle").notNull(),
  nicho: text("nicho").notNull(),
  followersApprox: integer("followers_approx"),
  notas: text("notas"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertCompetitorSchema = createInsertSchema(
  competitorsTable,
).omit({ id: true, createdAt: true });
export type InsertCompetitor = z.infer<typeof insertCompetitorSchema>;
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

export const insertCompetitorReelSchema = createInsertSchema(
  competitorReelsTable,
).omit({ id: true, createdAt: true });
export type InsertCompetitorReel = z.infer<typeof insertCompetitorReelSchema>;
export type CompetitorReel = typeof competitorReelsTable.$inferSelect;
