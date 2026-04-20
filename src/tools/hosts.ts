import { z } from "zod/v4";
import { unifiClient } from "../client.js";

export const listHostsSchema = z.object({});

export async function listHosts() {
  const response = await unifiClient.get<{ data: unknown[] }>("/hosts");
  return response.data;
}

export const getHostSchema = z.object({
  id: z.string().describe("Host ID"),
});

export async function getHost(params: z.infer<typeof getHostSchema>) {
  const response = await unifiClient.get<{ data: unknown }>(`/hosts/${params.id}`);
  return response.data;
}
