import { z } from "zod/v4";
import { unifiClient } from "../client.js";

export const listSitesSchema = z.object({});

export async function listSites() {
  const response = await unifiClient.get<{ data: unknown[] }>("/sites");
  return response.data;
}
