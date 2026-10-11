"use client";

import { useEffect, useState } from "react";
import { ProgressBar } from "@/components/WeekView";
import { api, type GoalItem } from "@/lib/client";

export default function GoalsView() {
  const [goals, setGoals] = useState<GoalItem[] | null>(null);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editing, setEditing] = useState<GoalItem | null>(null);

  useEffect(() => {
    api<GoalItem[]>("/api/goals?withProgress=1")
      .then(setGoals)
      .catch((e) => setError(e instanceof Error ? e.message : "불러오기 실패"));
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    try {
      const g = await api<GoalItem>("/api/goals", { method: "POST", body: { title, description } });
      setGoals((cur) => [...(cur ?? []), { ...g, progress: 0 }]);
      setTitle("");
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "추가 실패");
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    try {
      const g = await api<GoalItem>(`/api/goals/${editing.id}`, { method: "PATCH", body: { title: editing.title, description: editing.description } });
      setGoals((cur) => cur?.map((x) => (x.id === g.id ? { ...g, progress: x.progress } : x)) ?? null);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "수정 실패");
    }
  }

  async function remove(id: string) {
    try {
      await api(`/api/goals/${id}`, { method: "DELETE" });
      setGoals((cur) => cur?.filter((g) => g.id !== id) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제 실패");
    }
  }

  const field = "w-full rounded border border-zinc-700 px-2 py-1 text-sm";
  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="rounded bg-red-950 p-2 text-sm text-red-300">
          {error}
        </p>
      )}
      <form onSubmit={add} className="space-y-2 rounded-lg border border-zinc-800 p-3">
        <h2 className="font-semibold">1년 목표 추가</h2>
        <input aria-label="목표 제목" className={field} placeholder="예: 올해 안에 개발자로 취업" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea aria-label="목표 설명" className={`${field} h-20`} placeholder="이 목표를 왜 이루고 싶은지" value={description} onChange={(e) => setDescription(e.target.value)} />
        <button type="submit" className="rounded bg-zinc-800 px-3 py-1 text-sm text-zinc-100">
          추가
        </button>
      </form>

      {goals === null ? (
        <p className="text-sm text-zinc-400">불러오는 중...</p>
      ) : goals.length === 0 ? (
        <p className="text-sm text-zinc-400">아직 목표가 없습니다. 첫 1년 목표를 추가해 보세요.</p>
      ) : (
        <ul className="space-y-3">
          {goals.map((g) => (
            <li key={g.id} className="space-y-2 rounded-lg border border-zinc-800 p-3">
              {editing?.id === g.id ? (
                <form onSubmit={saveEdit} className="space-y-2">
                  <input aria-label="제목 수정" className={field} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} required />
                  <textarea aria-label="설명 수정" className={`${field} h-20`} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                  <div className="flex gap-2">
                    <button type="submit" className="rounded bg-zinc-800 px-3 py-1 text-sm text-zinc-100">
                      저장
                    </button>
                    <button type="button" className="rounded border px-3 py-1 text-sm" onClick={() => setEditing(null)}>
                      취소
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium">{g.title}</h3>
                      {g.description && <p className="whitespace-pre-wrap text-sm text-zinc-400">{g.description}</p>}
                    </div>
                    <div className="flex gap-2 text-xs">
                      <button type="button" onClick={() => setEditing(g)} aria-label={`${g.title} 수정`}>
                        수정
                      </button>
                      <button type="button" className="text-red-400" onClick={() => remove(g.id)} aria-label={`${g.title} 삭제`}>
                        삭제
                      </button>
                    </div>
                  </div>
                  <ProgressBar value={g.progress ?? 0} label="목표 진행률" />
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
