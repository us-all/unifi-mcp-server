import { createWrapToolHandler } from "@us-all/mcp-toolkit";
import { UniFiError } from "../client.js";
import { ConnectorError, ConnectorUnavailableError } from "../connector-client.js";

export const wrapToolHandler = createWrapToolHandler({
  redactionPatterns: [/X-API-KEY/i],
  errorExtractors: [
    {
      match: (error) => error instanceof ConnectorUnavailableError,
      extract: (error) => ({
        kind: "passthrough",
        text: (error as ConnectorUnavailableError).message,
      }),
    },
    {
      match: (error) => error instanceof ConnectorError,
      extract: (error) => {
        const e = error as ConnectorError;
        return {
          kind: "structured",
          data: { message: e.message, status: e.status, details: e.body },
        };
      },
    },
    {
      match: (error) => error instanceof UniFiError,
      extract: (error) => {
        const e = error as UniFiError;
        return {
          kind: "structured",
          data: { message: e.message, status: e.status, details: e.body },
        };
      },
    },
  ],
});
