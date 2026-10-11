import { describe, expect, it } from "vitest";
import { sessionWithUserId, userIdFromGithubId, withUserId } from "./user-id";

describe("userIdFromGithubId", () => {
  it("prefixes the GitHub account id", () => expect(userIdFromGithubId("12345")).toBe("github:12345"));
  it("accepts numeric ids", () => expect(userIdFromGithubId(12345)).toBe("github:12345"));
  it.each([undefined, null, "", "  ", "null", "undefined"])("rejects %j", (v) => {
    expect(() => userIdFromGithubId(v as never)).toThrow();
  });
});

describe("withUserId (jwt callback)", () => {
  it("stores the id from the GitHub profile at sign-in", () => {
    expect(withUserId({ name: "Yoann" }, { id: 42 })).toMatchObject({ name: "Yoann", userId: "github:42" });
  });
  it("keeps an existing id on later requests when there is no profile", () => {
    expect(withUserId({ userId: "github:42" }, undefined).userId).toBe("github:42");
  });
  it("ignores display name and email when deriving the id", () => {
    expect(withUserId({ name: "x", email: "a@b.c" }, { id: 7 }).userId).toBe("github:7");
  });
});

describe("sessionWithUserId (session callback)", () => {
  it("copies the token id onto session.user.id", () => {
    const s = sessionWithUserId({ user: { name: "n" } as { id?: string; name: string } }, { userId: "github:42" });
    expect(s.user.id).toBe("github:42");
  });
  it("leaves the session without an id when the token has none", () => {
    expect(sessionWithUserId({ user: { name: "n" } as { id?: string; name: string } }, {}).user.id).toBeUndefined();
  });
});
