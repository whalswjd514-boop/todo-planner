import { describe, expect, it } from "vitest";
import { missingAuthEnv } from "./auth-config";

describe("missingAuthEnv", () => {
  it("lists every variable when none are set", () => {
    expect(missingAuthEnv({})).toEqual(["AUTH_SECRET", "AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET"]);
  });
  it("treats blank values as missing", () => {
    expect(missingAuthEnv({ AUTH_SECRET: "s", AUTH_GITHUB_ID: "", AUTH_GITHUB_SECRET: "  " })).toEqual(["AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET"]);
  });
  it("returns nothing when all are set", () => {
    expect(missingAuthEnv({ AUTH_SECRET: "s", AUTH_GITHUB_ID: "i", AUTH_GITHUB_SECRET: "x" })).toEqual([]);
  });
});
