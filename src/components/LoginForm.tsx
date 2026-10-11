export default function LoginForm({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action} className="w-full">
      <button type="submit" className="w-full rounded-md bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-white">
        GitHub로 로그인
      </button>
    </form>
  );
}
