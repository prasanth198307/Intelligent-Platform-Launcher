import { pgTable, serial, text, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";

export const workspaces = pgTable("workspaces", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  sessionId: varchar("session_id", { length: 100 }).notNull(),
  domain: varchar("domain", { length: 50 }).notNull(),
  database: varchar("database", { length: 50 }).notNull(),
  entityCount: text("entity_count"),
  transactionsPerDay: text("transactions_per_day"),
  compliance: jsonb("compliance").$type<string[]>(),
  deploymentType: varchar("deployment_type", { length: 50 }),
  multiTenant: jsonb("multi_tenant"),
  multiLingual: jsonb("multi_lingual"),
  crossDomain: jsonb("cross_domain"),
  modules: jsonb("modules"),
  screens: jsonb("screens"),
  tables: jsonb("tables"),
  tests: jsonb("tests"),
  integrations: jsonb("integrations"),
  scaffolding: jsonb("scaffolding"),
  infrastructure: jsonb("infrastructure"),
  costs: jsonb("costs"),
  security: jsonb("security"),
  clusterConfig: jsonb("cluster_config"),
  mobileConfig: jsonb("mobile_config"),
  status: varchar("status", { length: 50 }).default("draft"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Workspace = typeof workspaces.$inferSelect;
export type InsertWorkspace = typeof workspaces.$inferInsert;
