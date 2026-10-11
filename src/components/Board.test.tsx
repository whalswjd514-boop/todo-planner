// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Board, { moveTask } from "@/components/Board";
import type { TaskItem } from "@/lib/client";

const task = (over: Partial<TaskItem> = {}): TaskItem => ({
  id: "t1",
  title: "write report",
  weekStart: "2026-10-05",
  weeklyGoalId: null,
  day: null,
  status: "todo",
  priority: "High",
  dueDate: null,
  order: 1000,
  ...over,
});

/** A tiny store that applies functional updates like React state does. */
function store(initial: TaskItem[]) {
  let tasks = initial;
  return {
    get: () => tasks,
    set: (update: (prev: TaskItem[]) => TaskItem[]) => {
      tasks = update(tasks);
    },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("moveTask", () => {
  it("applies the new status optimistically and persists it", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const s = store([task()]);
    await moveTask(s.get(), "t1", "doing", s.set, vi.fn());
    expect(s.get()[0].status).toBe("doing");
    expect(fetchMock).toHaveBeenCalledWith("/api/tasks/t1", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ status: "doing" }) }));
  });

  it("returns the card to its original column when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "boom" }), { status: 500 })));
    const s = store([task()]);
    const onError = vi.fn();
    await moveTask(s.get(), "t1", "done", s.set, onError);
    expect(s.get()[0].status).toBe("todo");
    expect(onError).toHaveBeenCalledWith("boom");
  });

  it("a failed move does not undo another successful move", async () => {
    let rejectA: (r: Response) => void = () => {};
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => new Promise<Response>((res) => (rejectA = res)))
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const s = store([task({ id: "a" }), task({ id: "b", title: "other" })]);
    const moveA = moveTask(s.get(), "a", "done", s.set, vi.fn());
    await moveTask(s.get(), "b", "doing", s.set, vi.fn());
    rejectA(new Response(JSON.stringify({ error: "boom" }), { status: 500 }));
    await moveA;
    expect(s.get().find((t) => t.id === "a")?.status).toBe("todo");
    expect(s.get().find((t) => t.id === "b")?.status).toBe("doing");
  });

  it("does nothing when the status is unchanged", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const setTasks = vi.fn();
    await moveTask([task()], "t1", "todo", setTasks, vi.fn());
    expect(setTasks).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("Board", () => {
  it("renders tasks in their status columns and marks overdue tasks", () => {
    render(
      <Board
        tasks={[task({ id: "a", status: "todo", dueDate: "2026-10-01" }), task({ id: "b", title: "other", status: "done" })]}
        setTasks={vi.fn()}
        today="2026-10-11"
        onEdit={vi.fn()}
        onError={vi.fn()}
      />,
    );
    expect(screen.getByTestId("column-todo")).toContainElement(screen.getByTestId("task-a"));
    expect(screen.getByTestId("column-done")).toContainElement(screen.getByTestId("task-b"));
    expect(screen.getByText(/마감 지남/)).toBeInTheDocument();
    expect(screen.getAllByText("High")).toHaveLength(2);
  });
});
