/** Pure helpers that map a GitHub account onto this app's user id. Kept free of next-auth imports so they are unit-testable. */

export function userIdFromGithubId(id: string | number | null | undefined): string {
  const value = String(id ?? "").trim();
  if (!value || value === "null" || value === "undefined") throw new Error("GitHub account id is required");
  return `github:${value}`;
}

/** Auth.js `jwt` callback: `profile` is only present at sign-in, afterwards the token already carries the id. */
export function withUserId<T extends object>(token: T, profile?: { id?: string | number | null } | null): T & { userId?: string } {
  if (profile?.id != null) return { ...token, userId: userIdFromGithubId(profile.id) };
  return token as T & { userId?: string };
}

/** Auth.js `session` callback: expose the stable id (never the display name or email) to server code. */
export function sessionWithUserId<S extends { user?: { id?: string } }>(session: S, token: { userId?: unknown }): S {
  if (typeof token.userId === "string" && session.user) session.user.id = token.userId;
  return session;
}
