"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Board, { type TasksUpdater } from "@/components/Board";
import TaskModal from "@/components/TaskModal";
import { api, DAY_LABELS, type GoalItem, type TaskItem, type WeekData } from "@/lib/client";
import { taskProgress } from "@/lib/progress";
import { addWeeks, toDateString } from "@/lib/week";

export function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-zinc-400">
        <span>{label}</span>
        <span data-testid="progress-value">{value}%</span>
      </div>
      <div className="h-2 rounded bg-zinc-700" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className="h-2 rounded bg-blue-600 transition-all" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function WeekView({ weekStart, showNav = true }: { weekStart: string; showNav?: boolean }) {
  const [week, setWeek] = useState<WeekData | null>(null);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<{ task: TaskItem | null } | null>(null);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalParent, setNewGoalParent] = useState("");
  const [addingGoal, setAddingGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<{ id: string; title: string; goalId: string } | null>(null);
  const [memo, setMemo] = useState("");
  const [retro, setRetro] = useState("");
  const [today, setToday] = useState("");

  const load = useCallback(async () => {
    try {
      const [w, g] = await Promise.all([api<WeekData>(`/api/weeks/${weekStart}`), api<GoalItem[]>("/api/goals")]);
      setWeek(w);
      setGoals(g);
      setMemo(w.memo);
      setRetro(w.retrospective);
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기 실패");
    }
  }, [weekStart]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(toDateString(new Date()));
    void load();
  }, [load]);

  if (!week) return <p className="text-sm text-zinc-400">{error || "불러오는 중..."}</p>;

  const setTasks: TasksUpdater = (update) =>
    setWeek((w) => {
      if (!w) return w;
      const tasks = update(w.tasks);
      return { ...w, tasks, progress: taskProgress(tasks) };
    });

  async function addWeeklyGoal(e: React.FormEvent) {
    e.preventDefault();
    if (addingGoal) return;
    setAddingGoal(true);
    setError("");
    try {
      const created = await api<WeekData["weeklyGoals"][number]>("/api/weekly-goals", {
        method: "POST",
        body: { weekStart, title: newGoalTitle, goalId: newGoalParent || null },
      });
      setWeek((w) => (w ? { ...w, weeklyGoals: [...w.weeklyGoals, created] } : w));
      setNewGoalTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "추가 실패");
    } finally {
      setAddingGoal(false);
    }
  }

  async function saveWeeklyGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!editingGoal) return;
    setError("");
    try {
      const updated = await api<WeekData["weeklyGoals"][number]>(`/api/weekly-goals/${editingGoal.id}`, {
        method: "PATCH",
        body: { title: editingGoal.title, goalId: editingGoal.goalId || null },
      });
      setWeek((w) => (w ? { ...w, weeklyGoals: w.weeklyGoals.map((g) => (g.id === updated.id ? updated : g)) } : w));
      setEditingGoal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "수정 실패");
    }
  }

  async function removeWeeklyGoal(id: string) {
    setError("");
    try {
      await api(`/api/weekly-goals/${id}`, { method: "DELETE" });
      setWeek((w) =>
        w
          ? {
              ...w,
              weeklyGoals: w.weeklyGoals.filter((g) => g.id !== id),
              tasks: w.tasks.map((t) => (t.weeklyGoalId === id ? { ...t, weeklyGoalId: null } : t)),
            }
          : w,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제 실패");
    }
  }

  async function savePlan(body: { memo?: string; retrospective?: string }) {
    try {
      await api(`/api/weeks/${weekStart}`, { method: "PUT", body });
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    }
  }

  function onSaved(t: TaskItem) {
    setTasks((prev) => (prev.some((x) => x.id === t.id) ? prev.map((x) => (x.id === t.id ? t : x)) : [...prev, t]));
    setModal(null);
  }

  const goalName = (id: string | null) => goals.find((g) => g.id === id)?.title;
  const label = `${weekStart} 주`;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">{label}</h2>
        {showNav && (
          <nav className="flex gap-2 text-sm">
            <Link className="rounded border px-2 py-1" href={`/week/${addWeeks(weekStart, -1)}`}>
              ← 지난 주
            </Link>
            <Link className="rounded border px-2 py-1" href={`/week/${addWeeks(weekStart, 1)}`}>
              다음 주 →
            </Link>
          </nav>
        )}
      </header>

      {error && (
        <p role="alert" className="rounded bg-red-950 p-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <ProgressBar value={week.progress} label="주간 진행률" />

      <section aria-labelledby="wg-title" className="space-y-2">
        <h3 id="wg-title" className="font-semibold">
          이번 주 목표 ({week.weeklyGoals.length}/5)
        </h3>
        <ul className="space-y-1">
          {week.weeklyGoals.map((g) => (
            <li key={g.id} className="rounded bg-zinc-800 px-2 py-1 text-sm">
              {editingGoal?.id === g.id ? (
                <form onSubmit={saveWeeklyGoal} className="flex flex-wrap gap-2">
                  <input
                    aria-label="주간 목표 이름 수정"
                    className="min-w-48 flex-1 rounded border border-zinc-700 px-2 py-1"
                    value={editingGoal.title}
                    onChange={(e) => setEditingGoal({ ...editingGoal, title: e.target.value })}
                    required
                    autoFocus
                  />
                  <select
                    aria-label="연결할 1년 목표 수정"
                    className="rounded border border-zinc-700 px-2 py-1"
                    value={editingGoal.goalId}
                    onChange={(e) => setEditingGoal({ ...editingGoal, goalId: e.target.value })}
                  >
                    <option value="">1년 목표 연결 안 함</option>
                    {goals.map((yg) => (
                      <option key={yg.id} value={yg.id}>
                        {yg.title}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="rounded bg-zinc-800 px-3 py-1 text-zinc-100">
                    저장
                  </button>
                  <button type="button" className="rounded border px-3 py-1" onClick={() => setEditingGoal(null)}>
                    취소
                  </button>
                </form>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span>
                    {g.title}
                    {goalName(g.goalId) && <span className="ml-2 text-xs text-zinc-400">→ {goalName(g.goalId)}</span>}
                  </span>
                  <span className="flex gap-2 text-xs">
                    <button type="button" onClick={() => setEditingGoal({ id: g.id, title: g.title, goalId: g.goalId ?? "" })} aria-label={`${g.title} 수정`}>
                      수정
                    </button>
                    <button type="button" className="text-red-400" onClick={() => removeWeeklyGoal(g.id)} aria-label={`${g.title} 삭제`}>
                      삭제
                    </button>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
        <form onSubmit={addWeeklyGoal} className="flex flex-wrap gap-2">
          <input
            aria-label="주간 목표 제목"
            className="min-w-48 flex-1 rounded border border-zinc-700 px-2 py-1 text-sm"
            placeholder="주간 목표 추가"
            value={newGoalTitle}
            onChange={(e) => setNewGoalTitle(e.target.value)}
            required
          />
          <select aria-label="연결할 1년 목표" className="rounded border border-zinc-700 px-2 py-1 text-sm" value={newGoalParent} onChange={(e) => setNewGoalParent(e.target.value)}>
            <option value="">1년 목표 연결 안 함</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
          <button type="submit" disabled={addingGoal} className="rounded bg-zinc-800 px-3 py-1 text-sm text-zinc-100 disabled:opacity-50">
            추가
          </button>
        </form>
      </section>

      <section aria-labelledby="board-title" className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 id="board-title" className="font-semibold">
            할 일 보드
          </h3>
          <button type="button" className="rounded bg-blue-600 px-3 py-1 text-sm text-white" onClick={() => setModal({ task: null })}>
            + 할 일
          </button>
        </div>
        <Board tasks={week.tasks} setTasks={setTasks} today={today} onEdit={(t) => setModal({ task: t })} onError={setError} />
      </section>

      <section aria-labelledby="days-title" className="space-y-2">
        <h3 id="days-title" className="font-semibold">
          요일별 배치
        </h3>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-8">
          {[...DAY_LABELS.map((d, i) => ({ label: d, day: i as number | null })), { label: "미정", day: null as number | null }].map(({ label: l, day }) => (
            <div key={l} data-testid={`day-${day ?? "none"}`} className="rounded border border-zinc-800 p-2 text-sm">
              <div className="mb-1 font-medium">{l}</div>
              <ul className="space-y-1">
                {week.tasks
                  .filter((t) => t.day === day)
                  .map((t) => (
                    <li key={t.id} className={t.status === "done" ? "text-zinc-500 line-through" : ""}>
                      {t.title}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium">
          주간 메모
          <textarea
            className="mt-1 h-28 w-full rounded border border-zinc-700 p-2 font-normal"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            onBlur={() => savePlan({ memo })}
          />
        </label>
        <label className="block text-sm font-medium">
          주간 회고
          <textarea
            className="mt-1 h-28 w-full rounded border border-zinc-700 p-2 font-normal"
            value={retro}
            onChange={(e) => setRetro(e.target.value)}
            onBlur={() => savePlan({ retrospective: retro })}
          />
        </label>
      </section>

      {modal && (
        <TaskModal
          weekStart={weekStart}
          task={modal.task}
          weeklyGoals={week.weeklyGoals}
          onClose={() => setModal(null)}
          onSaved={onSaved}
          onDeleted={(id) => {
            setTasks((prev) => prev.filter((t) => t.id !== id));
            setModal(null);
          }}
        />
      )}
    </div>
  );
}
