import { describe, expect, it } from "vitest";
import { goalProgress, isOverdue, taskProgress } from "./progress";

describe("taskProgress", () => {
  it("is 0 for no tasks", () => expect(taskProgress([])).toBe(0));
  it("is 25 for 1 of 4 done", () =>
    expect(taskProgress([{ status: "done" }, { status: "todo" }, { status: "doing" }, { status: "todo" }])).toBe(25));
  it("is 100 when all done", () => expect(taskProgress([{ status: "done" }])).toBe(100));
});

describe("goalProgress", () => {
  const wgs = [
    { id: "w1", goalId: "g1" },
    { id: "w2", goalId: "g1" },
    { id: "w3", goalId: "g2" },
  ];
  const tasks = [
    { weeklyGoalId: "w1", status: "done" as const },
    { weeklyGoalId: "w2", status: "todo" as const },
    { weeklyGoalId: "w3", status: "done" as const },
    { weeklyGoalId: null, status: "done" as const },
  ];
  it("aggregates tasks across linked weekly goals", () => expect(goalProgress("g1", wgs, tasks)).toBe(50));
  it("is 0 for a goal without tasks", () => expect(goalProgress("g9", wgs, tasks)).toBe(0));
  it("is 100 when all linked tasks are done", () => expect(goalProgress("g2", wgs, tasks)).toBe(100));
});

describe("isOverdue", () => {
  it("flags past-due unfinished tasks", () => {
    expect(isOverdue({ status: "todo", dueDate: "2026-10-01" }, "2026-10-11")).toBe(true);
    expect(isOverdue({ status: "done", dueDate: "2026-10-01" }, "2026-10-11")).toBe(false);
    expect(isOverdue({ status: "todo", dueDate: null }, "2026-10-11")).toBe(false);
  });
});
