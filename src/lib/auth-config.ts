const REQUIRED = ["AUTH_SECRET", "AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET"] as const;

/** Names of the Auth.js variables that are unset or blank (Auth.js itself only answers "Server error"). */
export function missingAuthEnv(env: Record<string, string | undefined>): string[] {
  return REQUIRED.filter((name) => !env[name]?.trim());
}
