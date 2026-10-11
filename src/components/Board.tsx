"use client";

import { DndContext, type DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { api, type TaskItem } from "@/lib/client";
import { isOverdue, STATUSES, type TaskStatus } from "@/lib/progress";

const COLUMN_LABEL: Record<TaskStatus, string> = { todo: "할 일", doing: "진행 중", done: "완료" };
const PRIORITY_STYLE: Record<string, string> = {
  High: "bg-red-950 text-red-300",
  Medium: "bg-amber-950 text-amber-300",
  Low: "bg-emerald-950 text-emerald-300",
};

function Card({ task, today, onEdit }: { task: TaskItem; today: string; onEdit: (t: TaskItem) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  const overdue = isOverdue(task, today);
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      data-testid={`task-${task.id}`}
      className={`cursor-grab rounded-md border bg-zinc-900 p-2 text-sm shadow-sm ${isDragging ? "opacity-40" : ""} ${overdue ? "border-red-500" : "border-zinc-700"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={task.status === "done" ? "line-through text-zinc-500" : ""}>{task.title}</span>
        <button
          type="button"
          aria-label={`${task.title} 수정`}
          className="text-xs text-zinc-400 hover:text-zinc-100"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onEdit(task)}
        >
          수정
        </button>
      </div>
      <div className="mt-1 flex flex-wrap gap-1 text-xs">
        <span className={`rounded px-1 ${PRIORITY_STYLE[task.priority]}`}>{task.priority}</span>
        {task.dueDate && (
          <span className={overdue ? "font-medium text-red-400" : "text-zinc-400"}>
            {overdue ? "마감 지남 " : "마감 "}
            {task.dueDate}
          </span>
        )}
      </div>
    </div>
  );
}

function Column({ status, tasks, today, onEdit }: { status: TaskStatus; tasks: TaskItem[]; today: string; onEdit: (t: TaskItem) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      data-testid={`column-${status}`}
      className={`min-h-32 flex-1 rounded-lg p-2 ${isOver ? "bg-blue-950" : "bg-zinc-800"}`}
    >
      <h3 className="mb-2 text-sm font-semibold">
        {COLUMN_LABEL[status]} <span className="text-zinc-400">({tasks.length})</span>
      </h3>
      <div className="flex flex-col gap-2">
        {tasks.map((t) => (
          <Card key={t.id} task={t} today={today} onEdit={onEdit} />
        ))}
      </div>
    </section>
  );
}

export type TasksUpdater = (update: (prev: TaskItem[]) => TaskItem[]) => void;

/**
 * Optimistically moves a task to a new status and persists it.
 * On failure only this task is reverted (functional update), so a concurrent successful move is kept.
 */
export async function moveTask(
  tasks: TaskItem[],
  id: string,
  status: TaskStatus,
  setTasks: TasksUpdater,
  onError: (message: string) => void,
) {
  const target = tasks.find((t) => t.id === id);
  if (!target || target.status === status) return;
  const previousStatus = target.status;
  const setStatus = (s: TaskStatus) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: s } : t)));
  setStatus(status);
  try {
    await api(`/api/tasks/${id}`, { method: "PATCH", body: { status } });
  } catch (e) {
    setStatus(previousStatus);
    onError(e instanceof Error ? e.message : "상태 변경에 실패했습니다");
  }
}

export default function Board({
  tasks,
  setTasks,
  today,
  onEdit,
  onError,
}: {
  tasks: TaskItem[];
  setTasks: TasksUpdater;
  today: string;
  onEdit: (t: TaskItem) => void;
  onError: (message: string) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function onDragEnd(e: DragEndEvent) {
    const status = e.over?.id as TaskStatus | undefined;
    if (!status || !STATUSES.includes(status)) return;
    void moveTask(tasks, String(e.active.id), status, setTasks, onError);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="flex flex-col gap-3 md:flex-row">
        {STATUSES.map((s) => (
          <Column key={s} status={s} tasks={tasks.filter((t) => t.status === s)} today={today} onEdit={onEdit} />
        ))}
      </div>
    </DndContext>
  );
}
