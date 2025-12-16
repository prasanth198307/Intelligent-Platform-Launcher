import { pgTable, serial, text, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";

// Chat sessions for incremental development
export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  sessionId: varchar("session_id", { length: 100 }).notNull().unique(),
  domain: varchar("domain", { length: 100 }),
  database: varchar("database", { length: 50 }).default("postgresql"),
  cloudProvider: varchar("cloud_provider", { length: 50 }).default("aws"),
  modules: jsonb("modules").$type<Array<{
    name: string;
    status: 'planned' | 'in_progress' | 'completed';
    tables: Array<{ name: string; columns: Array<{ name: string; type: string; references?: string }> }>;
    apis: string[];
    screens: string[];
  }>>().default([]),
  conversationHistory: jsonb("conversation_history").$type<Array<{
    role: 'user' | 'assistant';
    message: string;
    timestamp: string;
  }>>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = typeof chatSessions.$inferInsert;

// AI-powered Projects
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  projectId: varchar("project_id", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  domain: varchar("domain", { length: 100 }),
  database: varchar("database", { length: 50 }).default("postgresql"),
  cloudProvider: varchar("cloud_provider", { length: 50 }).default("aws"),
  status: varchar("status", { length: 50 }).default("planning"),
  modules: jsonb("modules").$type<Array<{
    name: string;
    description: string;
    status: 'planned' | 'in_progress' | 'completed';
    tables: Array<{ name: string; columns: Array<{ name: string; type: string; primaryKey?: boolean; references?: string }> }>;
    apis: Array<{ method: string; path: string; description: string }>;
    screens: Array<{ name: string; type: string; route: string }>;
    generatedCode?: { migration?: string; apiRoutes?: string; screens?: string };
  }>>().default([]),
  generatedFiles: jsonb("generated_files").$type<Array<{ path: string; content: string; type: string }>>().default([]),
  conversationHistory: jsonb("conversation_history").$type<Array<{
    role: 'user' | 'assistant';
    message: string;
    timestamp: string;
  }>>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

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
