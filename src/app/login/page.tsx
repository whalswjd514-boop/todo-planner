import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth, signIn } from "@/auth";
import LoginForm from "@/components/LoginForm";
import { missingAuthEnv } from "@/lib/auth-config";

export const metadata = { title: "로그인" };

async function LoginContent() {
  const session = await auth();
  if (session?.user) redirect("/");
  const missing = missingAuthEnv(process.env);

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col items-center justify-center gap-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">할 일 + 계획</h1>
        <p className="mt-2 text-sm text-zinc-400">할 일, 주간 계획, 1년 목표를 한곳에서 관리하세요.</p>
      </div>
      {missing.length > 0 ? (
        <div role="alert" className="w-full rounded-md border border-amber-700 bg-amber-950 p-4 text-left text-sm text-amber-200">
          <p className="font-semibold">GitHub 로그인 설정이 아직 끝나지 않았습니다.</p>
          <p className="mt-2">
            <code>.env.local</code>에 다음 값을 채운 뒤 <code>npm run dev</code>를 다시 시작하세요.
          </p>
          <ul className="mt-2 list-disc pl-5">
            {missing.map((name) => (
              <li key={name}>
                <code>{name}</code>
              </li>
            ))}
          </ul>
          <p className="mt-2">자세한 방법은 README의 &ldquo;GitHub 로그인 설정&rdquo;을 참고하세요.</p>
        </div>
      ) : (
        <LoginForm
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/" });
          }}
        />
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-center text-sm text-zinc-400">불러오는 중...</p>}>
      <LoginContent />
    </Suspense>
  );
}
