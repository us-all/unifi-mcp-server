import { z } from "zod/v4";
import { applyExtractFields } from "@us-all/mcp-toolkit";
import { unifiClient } from "../client.js";
import { extractFieldsDescription } from "./extract-fields.js";

const ef = z.string().optional().describe(extractFieldsDescription);

export const listDevicesSchema = z.object({
  hostId: z.string().optional().describe("Filter by host ID"),
  type: z.string().optional().describe("Filter by device type (e.g., 'uap', 'usw', 'ugw')"),
  extractFields: ef,
});

export async function listDevices(params: z.infer<typeof listDevicesSchema>) {
  const queryParams: Record<string, string | undefined> = {};
  if (params.hostId) queryParams.hostId = params.hostId;
  if (params.type) queryParams.type = params.type;

  const response = await unifiClient.get<{ data: unknown[] }>("/devices", queryParams);
  if (params.extractFields) return response.data;
  return applyExtractFields(
    response.data,
    "*.hostId,*.hostName,*.devices.*.id,*.devices.*.name,*.devices.*.model,*.devices.*.status,*.devices.*.version",
  );
}
