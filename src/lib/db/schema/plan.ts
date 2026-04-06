import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

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

export type PlanReel = typeof planReelsTable.$inferSelect;

export const planObjectivesTable = pgTable("plan_objectives", {
  id: serial("id").primaryKey(),
  mes: integer("mes").notNull(),
  objetivoText: text("objetivo_text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type PlanObjective = typeof planObjectivesTable.$inferSelect;
