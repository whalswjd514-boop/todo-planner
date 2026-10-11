export type TaskStatus = "todo" | "doing" | "done";

export const STATUSES: TaskStatus[] = ["todo", "doing", "done"];

export function taskProgress(tasks: { status: TaskStatus }[]): number {
  if (tasks.length === 0) return 0;
  return Math.round((tasks.filter((t) => t.status === "done").length / tasks.length) * 100);
}

/** Progress of a yearly goal: all tasks whose weekly goal links to it. */
export function goalProgress(
  goalId: string,
  weeklyGoals: { id: string; goalId: string | null }[],
  tasks: { weeklyGoalId: string | null; status: TaskStatus }[],
): number {
  const ids = new Set(weeklyGoals.filter((w) => w.goalId === goalId).map((w) => w.id));
  return taskProgress(tasks.filter((t) => t.weeklyGoalId !== null && ids.has(t.weeklyGoalId)));
}

export function isOverdue(task: { status: TaskStatus; dueDate: string | null }, today: string): boolean {
  return task.status !== "done" && task.dueDate !== null && task.dueDate < today;
}
