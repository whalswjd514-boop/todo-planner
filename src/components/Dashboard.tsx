"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import WeekView from "@/components/WeekView";
import { api, type GoalItem } from "@/lib/client";
import { weekStartOf } from "@/lib/week";

export default function Dashboard() {
  const [goals, setGoals] = useState<GoalItem[] | null>(null);
  const [error, setError] = useState("");
  const [weekStart, setWeekStart] = useState<string | null>(null);

  useEffect(() => {
    // Date is read after mount so prerendering never bakes in a stale week.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWeekStart(weekStartOf(new Date()));
    api<GoalItem[]>("/api/goals")
      .then(setGoals)
      .catch((e) => setError(e instanceof Error ? e.message : "불러오기 실패"));
  }, []);

  if (error) return <p role="alert" className="text-sm text-red-300">{error}</p>;
  if (goals === null || weekStart === null) return <p className="text-sm text-zinc-400">불러오는 중...</p>;

  return (
    <div className="space-y-6">
      {goals.length === 0 && (
        <section aria-label="시작하기" className="rounded-lg border border-blue-900 bg-blue-950 p-4 text-sm">
          <h2 className="mb-2 font-semibold">처음이신가요? 이렇게 시작하세요</h2>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              <Link className="underline" href="/goals">
                1년 목표
              </Link>
              를 작성합니다.
            </li>
            <li>이번 주 목표를 만들고 1년 목표와 연결합니다.</li>
            <li>주간 목표를 기반으로 할 일을 만들고 요일에 배치합니다.</li>
          </ol>
        </section>
      )}
      <WeekView weekStart={weekStart} showNav={false} />
    </div>
  );
}
