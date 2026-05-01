import { ToolRegistry, createSearchToolsMetaTool } from "@us-all/mcp-toolkit";
import { config } from "./config.js";

export const CATEGORIES = [
  "analysis",
  "raw",
  "devices",
  "clients",
  "networks",
  "firewall",
  "wan",
  "reference",
  "meta",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const registry = new ToolRegistry<Category>({
  enabledCategories: config.enabledCategories,
  disabledCategories: config.disabledCategories,
});

const meta = createSearchToolsMetaTool(registry, CATEGORIES,
  "Discover tools across the UniFi MCP surface (analysis, raw API, connector tools).");

export const searchToolsSchema = meta.schema;
export const searchTools = meta.handler;
