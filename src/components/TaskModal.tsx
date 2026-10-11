"use client";

import { useState } from "react";
import { api, DAY_LABELS, type Priority, type TaskItem, type WeeklyGoalItem } from "@/lib/client";

export default function TaskModal({
  weekStart,
  task,
  weeklyGoals,
  onClose,
  onSaved,
  onDeleted,
}: {
  weekStart: string;
  task: TaskItem | null;
  weeklyGoals: WeeklyGoalItem[];
  onClose: () => void;
  onSaved: (t: TaskItem) => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [weeklyGoalId, setWeeklyGoalId] = useState(task?.weeklyGoalId ?? "");
  const [day, setDay] = useState(task?.day === null || task?.day === undefined ? "" : String(task.day));
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "Medium");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const body = {
      title,
      weeklyGoalId: weeklyGoalId || null,
      day: day === "" ? null : Number(day),
      priority,
      dueDate: dueDate || null,
    };
    try {
      const saved = task
        ? await api<TaskItem>(`/api/tasks/${task.id}`, { method: "PATCH", body })
        : await api<TaskItem>("/api/tasks", { method: "POST", body: { ...body, weekStart } });
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
      setBusy(false);
    }
  }

  async function remove() {
    if (!task) return;
    setBusy(true);
    try {
      await api(`/api/tasks/${task.id}`, { method: "DELETE" });
      onDeleted(task.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제 실패");
      setBusy(false);
    }
  }

  const field = "w-full rounded border border-zinc-700 px-2 py-1 text-sm";
  return (
    <div role="dialog" aria-modal="true" aria-label={task ? "할 일 수정" : "할 일 추가"} className="fixed inset-0 z-10 flex items-center justify-center bg-black/70 p-4">
      <form onSubmit={save} className="w-full max-w-md space-y-3 rounded-lg bg-zinc-900 p-4 shadow-xl">
        <h2 className="text-lg font-semibold">{task ? "할 일 수정" : "할 일 추가"}</h2>
        <label className="block text-sm">
          제목
          <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
        </label>
        <label className="block text-sm">
          주간 목표
          <select className={field} value={weeklyGoalId} onChange={(e) => setWeeklyGoalId(e.target.value)}>
            <option value="">연결 안 함</option>
            {weeklyGoals.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            요일
            <select className={field} value={day} onChange={(e) => setDay(e.target.value)}>
              <option value="">미정</option>
              {DAY_LABELS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            우선순위
            <select className={field} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </label>
        </div>
        <label className="block text-sm">
          마감일
          <input type="date" className={field} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-between">
          {task ? (
            <button type="button" onClick={remove} disabled={busy} className="text-sm text-red-400">
              삭제
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded border px-3 py-1 text-sm">
              취소
            </button>
            <button type="submit" disabled={busy} className="rounded bg-zinc-800 px-3 py-1 text-sm text-zinc-100">
              저장
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
