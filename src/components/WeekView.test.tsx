// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import WeekView from "@/components/WeekView";

const WEEK = "2026-10-05";

function setup() {
  const state = {
    weeklyGoals: [{ id: "w1", title: "지원하기", weekStart: WEEK, goalId: null as string | null }],
    tasks: [
      { id: "t1", title: "이력서", weekStart: WEEK, weeklyGoalId: "w1" as string | null, day: 1, status: "todo", priority: "High", dueDate: null, order: 1000 },
    ],
  };
  const calls: string[] = [];
  const respond = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
      const method = init?.method ?? "GET";
      calls.push(`${method} ${url}`);
      const body = init?.body ? JSON.parse(init.body) : {};
      if (url === `/api/weeks/${WEEK}` && method === "GET") return respond({ weekStart: WEEK, memo: "", retrospective: "", progress: 0, ...state });
      if (url === "/api/goals") return respond([]);
      const wg = url.match(/^\/api\/weekly-goals\/(.+)$/);
      if (wg && method === "PATCH") {
        state.weeklyGoals = state.weeklyGoals.map((g) => (g.id === wg[1] ? { ...g, ...body } : g));
        return respond(state.weeklyGoals.find((g) => g.id === wg[1]));
      }
      if (wg && method === "DELETE") {
        state.weeklyGoals = state.weeklyGoals.filter((g) => g.id !== wg[1]);
        return respond({ ok: true });
      }
      const t = url.match(/^\/api\/tasks\/(.+)$/);
      if (t && method === "PATCH") {
        state.tasks = state.tasks.map((x) => (x.id === t[1] ? { ...x, ...body } : x));
        return respond(state.tasks.find((x) => x.id === t[1]));
      }
      if (t && method === "DELETE") {
        state.tasks = state.tasks.filter((x) => x.id !== t[1]);
        return respond({ ok: true });
      }
      return respond({ error: `unexpected ${method} ${url}` }, 500);
    }),
  );
  return calls;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("WeekView edit and delete", () => {
  it("renames a weekly goal", async () => {
    const calls = setup();
    render(<WeekView weekStart={WEEK} />);
    await screen.findByText("지원하기");
    fireEvent.click(screen.getByRole("button", { name: "지원하기 수정" }));
    const input = screen.getByLabelText("주간 목표 이름 수정");
    fireEvent.change(input, { target: { value: "면접 준비" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await screen.findByText("면접 준비");
    expect(screen.queryByText("지원하기")).toBeNull();
    expect(calls).toContain("PATCH /api/weekly-goals/w1");
  });

  it("deletes a weekly goal and unlinks its tasks", async () => {
    const calls = setup();
    render(<WeekView weekStart={WEEK} />);
    await screen.findByText("지원하기");
    fireEvent.click(screen.getByRole("button", { name: "지원하기 삭제" }));
    await waitFor(() => expect(screen.queryByText("지원하기")).toBeNull());
    expect(calls).toContain("DELETE /api/weekly-goals/w1");
    expect(screen.getAllByText("이력서").length).toBeGreaterThan(0);
  });

  it("edits a task from its card", async () => {
    const calls = setup();
    render(<WeekView weekStart={WEEK} />);
    await screen.findAllByText("이력서");
    fireEvent.pointerDown(screen.getByRole("button", { name: "이력서 수정" }));
    fireEvent.click(screen.getByRole("button", { name: "이력서 수정" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "이력서 제출" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(dialog).not.toBeInTheDocument();
    expect((await screen.findAllByText("이력서 제출")).length).toBeGreaterThan(0);
    expect(calls).toContain("PATCH /api/tasks/t1");
  });

  it("deletes a task from the modal", async () => {
    const calls = setup();
    render(<WeekView weekStart={WEEK} />);
    await screen.findAllByText("이력서");
    fireEvent.click(screen.getByRole("button", { name: "이력서 수정" }));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    await waitFor(() => expect(screen.queryByText("이력서")).toBeNull());
    expect(calls).toContain("DELETE /api/tasks/t1");
  });
});
