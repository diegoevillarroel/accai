import {
  pgTable,
  serial,
  text,
  integer,
  real,
  timestamp,
} from "drizzle-orm/pg-core";

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

export type AccaiSession = typeof accaiSessionsTable.$inferSelect;
