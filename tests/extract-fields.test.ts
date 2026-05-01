import { describe, it, expect } from "vitest";
import { applyExtractFields } from "../src/tools/extract-fields.js";

describe("applyExtractFields", () => {
  it("returns data unchanged when expr is empty", () => {
    expect(applyExtractFields({ a: 1, b: 2 }, "")).toEqual({ a: 1, b: 2 });
    expect(applyExtractFields({ a: 1, b: 2 }, undefined)).toEqual({ a: 1, b: 2 });
  });

  it("projects flat fields", () => {
    const data = { hostId: "h1", name: "USM", status: "online", model: "UDM-Pro" };
    expect(applyExtractFields(data, "hostId,name")).toEqual({ hostId: "h1", name: "USM" });
  });

  it("projects array wildcards", () => {
    const data = {
      sites: [
        { name: "USM", devices: { total: 5, online: 5 } },
        { name: "USS", devices: { total: 3, online: 2 } },
      ],
    };
    expect(applyExtractFields(data, "sites.*.name,sites.*.devices.online")).toEqual({
      sites: [
        { name: "USM", devices: { online: 5 } },
        { name: "USS", devices: { online: 2 } },
      ],
    });
  });
});
