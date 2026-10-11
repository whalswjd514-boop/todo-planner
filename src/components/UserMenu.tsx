import { auth, signOut } from "@/auth";

export default async function UserMenu() {
  const session = await auth();
  if (!session?.user) return null;
  const { name, email, image } = session.user;

  return (
    <div className="mt-6 border-t border-zinc-800 pt-4">
      <div className="flex items-center gap-2 px-3 text-sm">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" width={28} height={28} className="rounded-full" />
        )}
        <span className="min-w-0 truncate text-zinc-300" title={email ?? undefined}>
          {name ?? email}
        </span>
      </div>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <button type="submit" className="mt-2 w-full rounded-md px-3 py-2 text-left text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100">
          로그아웃
        </button>
      </form>
    </div>
  );
}
