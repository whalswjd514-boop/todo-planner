import { auth } from "@/auth";

/** The signed-in user's id ("github:<id>"), or null when there is no session. */
export async function getUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
