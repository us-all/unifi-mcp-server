import { z } from "zod/v4";
import { applyExtractFields } from "@us-all/mcp-toolkit";
import { unifiClient } from "../client.js";
import { extractFieldsDescription } from "./extract-fields.js";

const ef = z.string().optional().describe(extractFieldsDescription);

export const listHostsSchema = z.object({
  extractFields: ef,
});

export async function listHosts(params: z.infer<typeof listHostsSchema> = {}) {
  const response = await unifiClient.get<{ data: unknown[] }>("/hosts");
  if (params.extractFields) return response.data;
  return applyExtractFields(
    response.data,
    "*.id,*.reportedState.hostname,*.reportedState.state,*.reportedState.hardware.shortname,*.reportedState.firmwareVersion",
  );
}

export const getHostSchema = z.object({
  id: z.string().describe("Host ID"),
});

export async function getHost(params: z.infer<typeof getHostSchema>) {
  const response = await unifiClient.get<{ data: unknown }>(`/hosts/${params.id}`);
  return response.data;
}
