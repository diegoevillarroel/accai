import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const planReelsTable = pgTable("plan_reels", {
  id: serial("id").primaryKey(),
  mes: integer("mes").notNull(),
  semana: integer("semana").notNull(),
  slot: integer("slot").notNull(),
  reelId: integer("reel_id"),
  conceptoTema: text("concepto_tema"),
  conceptoAngulo: text("concepto_angulo"),
  status: text("status").notNull().default("PENDIENTE"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertPlanReelSchema = createInsertSchema(planReelsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertPlanReel = z.infer<typeof insertPlanReelSchema>;
export type PlanReel = typeof planReelsTable.$inferSelect;

export const planObjectivesTable = pgTable("plan_objectives", {
  id: serial("id").primaryKey(),
  mes: integer("mes").notNull(),
  objetivoText: text("objetivo_text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertPlanObjectiveSchema = createInsertSchema(
  planObjectivesTable,
).omit({ id: true, createdAt: true });
export type InsertPlanObjective = z.infer<typeof insertPlanObjectiveSchema>;
export type PlanObjective = typeof planObjectivesTable.$inferSelect;
