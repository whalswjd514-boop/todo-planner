import { describe, expect, it } from "vitest";
import { loginRedirectPath } from "./route-access";

describe("loginRedirectPath", () => {
  it.each(["/", "/goals", "/week/2026-10-05"])("sends a signed-out visitor from %s to /login", (path) => {
    expect(loginRedirectPath(path, false)).toBe("/login");
  });
  it("lets a signed-out visitor see /login", () => expect(loginRedirectPath("/login", false)).toBeNull());
  it.each(["/", "/goals", "/week/2026-10-05"])("lets a signed-in user see %s", (path) => {
    expect(loginRedirectPath(path, true)).toBeNull();
  });
  it("sends a signed-in user away from /login", () => expect(loginRedirectPath("/login", true)).toBe("/"));
});
