import type { TaskStatus } from "@/lib/progress";

export type Priority = "High" | "Medium" | "Low";

export type GoalItem = { id: string; title: string; description: string; year: number; progress?: number };
export type WeeklyGoalItem = { id: string; title: string; weekStart: string; goalId: string | null };
export type TaskItem = {
  id: string;
  title: string;
  weekStart: string;
  weeklyGoalId: string | null;
  day: number | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  order: number;
};
export type WeekData = {
  weekStart: string;
  memo: string;
  retrospective: string;
  weeklyGoals: WeeklyGoalItem[];
  tasks: TaskItem[];
  progress: number;
};

export const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

export async function api<T>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? "GET",
    headers: { "content-type": "application/json" },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}
