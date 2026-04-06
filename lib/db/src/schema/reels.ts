import {
  pgTable,
  serial,
  text,
  integer,
  real,
  timestamp,
  date,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reelsTable = pgTable("reels", {
  id: serial("id").primaryKey(),
  url: text("url"),
  fecha: date("fecha").notNull(),
  tema: text("tema").notNull(),
  angulo: text("angulo").notNull(),
  formato: text("formato").notNull(),
  followersAtPublish: integer("followers_at_publish").notNull(),
  views: integer("views").notNull(),
  likes: integer("likes").notNull(),
  comments: integer("comments").notNull(),
  saves: integer("saves").notNull(),
  shares: integer("shares").notNull(),
  alcance: integer("alcance"),
  likesPct: real("likes_pct").notNull(),
  commentsPct: real("comments_pct").notNull(),
  savesPct: real("saves_pct").notNull(),
  sharesPct: real("shares_pct").notNull(),
  savesPer1k: real("saves_per_1k").notNull(),
  transcripcion: text("transcripcion"),
  notas: text("notas"),
  firma: text("firma").notNull(),
  instagramMediaId: text("instagram_media_id").unique(),
  permalink: text("permalink"),
  caption: text("caption"),
  watchTimeAvg: doublePrecision("watch_time_avg"),
  replays: integer("replays").default(0),
  completionRate: doublePrecision("completion_rate"),
  syncedAt: timestamp("synced_at"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertReelSchema = createInsertSchema(reelsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertReel = z.infer<typeof insertReelSchema>;
export type Reel = typeof reelsTable.$inferSelect;
