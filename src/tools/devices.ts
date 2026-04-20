import { z } from "zod/v4";
import { unifiClient } from "../client.js";

export const listDevicesSchema = z.object({
  hostId: z.string().optional().describe("Filter by host ID"),
  type: z.string().optional().describe("Filter by device type (e.g., 'uap', 'usw', 'ugw')"),
});

export async function listDevices(params: z.infer<typeof listDevicesSchema>) {
  const queryParams: Record<string, string | undefined> = {};
  if (params.hostId) queryParams.hostId = params.hostId;
  if (params.type) queryParams.type = params.type;

  const response = await unifiClient.get<{ data: unknown[] }>("/devices", queryParams);
  return response.data;
}
