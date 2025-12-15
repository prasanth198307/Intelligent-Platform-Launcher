import { z } from "zod";
export const FieldType = z.enum(["uuid","text","number","date","datetime","boolean","json","reference"]);
export const CanonicalSpecSchema = z.object({
  specVersion: z.string().default("1.0"),
  app: z.object({
    name: z.string().min(2),
    description: z.string().optional().default(""),
    domain: z.array(z.enum(["ami","cis","healthcare","insurance","manufacturing","generic"])).min(1),
    platformMode: z.enum(["normal","enterprise"]).default("normal"),
    tenancyModel: z.enum(["shared-db","schema-per-tenant","db-per-tenant"]).default("shared-db"),
    dataResidency: z.string().nullable().optional().default(null)
  }),
  nonFunctional: z.object({
    scale: z.object({
      users: z.enum(["low","medium","high"]).default("low"),
      tps: z.enum(["low","medium","high"]).default("low"),
      dataVolume: z.enum(["low","medium","high"]).default("low"),
      latency: z.enum(["normal","low-latency"]).default("normal")
    }).default({}),
    availability: z.enum(["standard","ha","multi-region"]).default("standard"),
    compliance: z.array(z.enum(["none","soc2","hipaa","pci","gdpr","dpdp-india"])).default(["none"])
  }).default({}),
  dataModel: z.object({
    entities: z.array(z.any()).default([]),
    relations: z.array(z.any()).default([])
  }).default({}),
  rules: z.array(z.any()).default([]),
  workflows: z.array(z.any()).default([]),
  integrations: z.array(z.any()).default([]),
  ui: z.any().default({}),
  deployment: z.any().default({})
});
export type CanonicalSpec = z.infer<typeof CanonicalSpecSchema>;
