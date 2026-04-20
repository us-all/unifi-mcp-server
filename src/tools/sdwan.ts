import { z } from "zod/v4";
import { unifiClient } from "../client.js";

export const listSdwanConfigsSchema = z.object({});

export async function listSdwanConfigs() {
  const response = await unifiClient.get<{ data: unknown[] }>("/sd-wan-configs");
  return response.data;
}

export const getSdwanConfigSchema = z.object({
  id: z.string().describe("SD-WAN config ID"),
});

export async function getSdwanConfig(params: z.infer<typeof getSdwanConfigSchema>) {
  const response = await unifiClient.get<{ data: unknown }>(`/sd-wan-configs/${params.id}`);
  return response.data;
}

export const getSdwanConfigStatusSchema = z.object({
  id: z.string().describe("SD-WAN config ID"),
});

export async function getSdwanConfigStatus(params: z.infer<typeof getSdwanConfigStatusSchema>) {
  const response = await unifiClient.get<{ data: unknown }>(`/sd-wan-configs/${params.id}/status`);
  return response.data;
}
