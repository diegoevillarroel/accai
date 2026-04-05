import {
  pgTable,
  serial,
  text,
  integer,
  real,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const accaiSessionsTable = pgTable("accai_sessions", {
  id: serial("id").primaryKey(),
  mode: text("mode").notNull(),
  input: text("input").notNull(),
  response: text("response").notNull(),
  tokensInput: integer("tokens_input"),
  tokensOutput: integer("tokens_output"),
  costEstimate: real("cost_estimate"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertAccaiSessionSchema = createInsertSchema(
  accaiSessionsTable,
).omit({ id: true, createdAt: true });
export type InsertAccaiSession = z.infer<typeof insertAccaiSessionSchema>;
export type AccaiSession = typeof accaiSessionsTable.$inferSelect;
