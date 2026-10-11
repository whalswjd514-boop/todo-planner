import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { connectDB, disconnectDB } from "@/lib/db";
import * as goals from "./goals/route";
import * as goalById from "./goals/[id]/route";
import * as weeklyGoals from "./weekly-goals/route";
import * as weeklyGoalById from "./weekly-goals/[id]/route";
import * as tasks from "./tasks/route";
import * as taskById from "./tasks/[id]/route";
import { WeeklyGoal } from "@/models/WeeklyGoal";
import * as weeks from "./weeks/[weekStart]/route";

const session = vi.hoisted(() => ({ userId: "github:alice" as string | null }));
vi.mock("@/lib/session", () => ({ getUserId: async () => session.userId }));

const WEEK = "2026-10-05";
let mongod: MongoMemoryServer;

const req = (method: string, body?: unknown, url = "http://localhost/api") =>
  new Request(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
const ctx = <T extends object>(p: T) => ({ params: Promise.resolve(p) });

async function post<T>(handler: (r: Request) => Promise<Response>, body: unknown): Promise<{ status: number; data: T }> {
  const res = await handler(req("POST", body));
  return { status: res.status, data: (await res.json()) as T };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri("todo-test");
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
  await mongod.stop();
});

beforeEach(async () => {
  session.userId = "github:alice";
  await mongoose.connection.dropDatabase();
  await WeeklyGoal.createIndexes();
});

type Id = { id: string };

describe("tasks", () => {
  it("creates, lists, updates status, and deletes", async () => {
    const created = await post<Id>(tasks.POST, { weekStart: WEEK, title: "write report", day: 2 });
    expect(created.status).toBe(201);

    const list = await (await tasks.GET(req("GET", undefined, `http://localhost/api/tasks?weekStart=${WEEK}`))).json();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ title: "write report", status: "todo", day: 2, priority: "Medium" });

    for (const status of ["doing", "done"]) {
      const res = await taskById.PATCH(req("PATCH", { status }), ctx({ id: created.data.id }));
      expect(res.status).toBe(200);
      expect((await res.json()).status).toBe(status);
    }

    const del = await taskById.DELETE(req("DELETE"), ctx({ id: created.data.id }));
    expect(del.status).toBe(200);
    expect((await taskById.DELETE(req("DELETE"), ctx({ id: created.data.id }))).status).toBe(404);
  });

  it("rejects invalid status, week and id", async () => {
    const created = await post<Id>(tasks.POST, { weekStart: WEEK, title: "t" });
    expect((await taskById.PATCH(req("PATCH", { status: "blocked" }), ctx({ id: created.data.id }))).status).toBe(400);
    expect((await post(tasks.POST, { weekStart: "2026-10-06", title: "t" })).status).toBe(400);
    expect((await taskById.PATCH(req("PATCH", { status: "done" }), ctx({ id: "nope" }))).status).toBe(400);
  });
});

describe("validation", () => {
  it("returns 400 (not 500) for empty or malformed link ids", async () => {
    const task = await post<Id>(tasks.POST, { weekStart: WEEK, title: "t" });
    expect((await post(weeklyGoals.POST, { weekStart: WEEK, title: "x", goalId: "" })).status).toBe(400);
    expect((await post(tasks.POST, { weekStart: WEEK, title: "x", weeklyGoalId: "" })).status).toBe(400);
    expect((await taskById.PATCH(req("PATCH", { weeklyGoalId: "" }), ctx({ id: task.data.id }))).status).toBe(400);
    expect((await taskById.PATCH(req("PATCH", { weeklyGoalId: "zzz" }), ctx({ id: task.data.id }))).status).toBe(400);
  });

  it("rejects impossible due dates", async () => {
    const task = await post<Id>(tasks.POST, { weekStart: WEEK, title: "t" });
    expect((await taskById.PATCH(req("PATCH", { dueDate: "2026-99-99" }), ctx({ id: task.data.id }))).status).toBe(400);
    expect((await taskById.PATCH(req("PATCH", { dueDate: "2026-02-30" }), ctx({ id: task.data.id }))).status).toBe(400);
    expect((await taskById.PATCH(req("PATCH", { dueDate: "2026-10-09" }), ctx({ id: task.data.id }))).status).toBe(200);
  });

  it("rejects linking a task to a weekly goal of another week", async () => {
    const wg = await post<Id>(weeklyGoals.POST, { weekStart: "2026-10-12", title: "next week goal" });
    expect((await post(tasks.POST, { weekStart: WEEK, title: "x", weeklyGoalId: wg.data.id })).status).toBe(400);
    const task = await post<Id>(tasks.POST, { weekStart: WEEK, title: "y" });
    expect((await taskById.PATCH(req("PATCH", { weeklyGoalId: wg.data.id }), ctx({ id: task.data.id }))).status).toBe(400);
  });
});

describe("weekly goals", () => {
  it("returns 400 for the 6th goal in one week", async () => {
    for (let i = 1; i <= 5; i++) {
      expect((await post(weeklyGoals.POST, { weekStart: WEEK, title: `g${i}` })).status).toBe(201);
    }
    expect((await post(weeklyGoals.POST, { weekStart: WEEK, title: "g6" })).status).toBe(400);
    expect((await post(weeklyGoals.POST, { weekStart: "2026-10-12", title: "next week" })).status).toBe(201);
  });

  it("never exceeds 5 goals under concurrent requests", async () => {
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => post(weeklyGoals.POST, { weekStart: WEEK, title: `c${i}` })));
    expect(results.filter((r) => r.status === 201)).toHaveLength(5);
    expect(results.filter((r) => r.status === 400)).toHaveLength(5);
    const week = await (await weeks.GET(req("GET"), ctx({ weekStart: WEEK }))).json();
    expect(week.weeklyGoals).toHaveLength(5);
  });

  it("frees a slot when a goal is deleted", async () => {
    const created: Id[] = [];
    for (let i = 0; i < 5; i++) created.push((await post<Id>(weeklyGoals.POST, { weekStart: WEEK, title: `g${i}` })).data);
    await weeklyGoalById.DELETE(req("DELETE"), ctx({ id: created[2].id }));
    expect((await post(weeklyGoals.POST, { weekStart: WEEK, title: "again" })).status).toBe(201);
    expect((await post(weeklyGoals.POST, { weekStart: WEEK, title: "too many" })).status).toBe(400);
  });

  it("rejects an unknown goalId", async () => {
    const res = await post(weeklyGoals.POST, { weekStart: WEEK, title: "x", goalId: new mongoose.Types.ObjectId().toString() });
    expect(res.status).toBe(400);
  });
});

describe("delete policies", () => {
  it("deleting a goal nulls WeeklyGoal.goalId; deleting a weekly goal nulls Task.weeklyGoalId", async () => {
    const goal = await post<Id>(goals.POST, { title: "Get a job" });
    const wg = await post<Id>(weeklyGoals.POST, { weekStart: WEEK, title: "apply", goalId: goal.data.id });
    const task = await post<Id>(tasks.POST, { weekStart: WEEK, title: "send CV", weeklyGoalId: wg.data.id });

    await goalById.DELETE(req("DELETE"), ctx({ id: goal.data.id }));
    let week = await (await weeks.GET(req("GET"), ctx({ weekStart: WEEK }))).json();
    expect(week.weeklyGoals[0].goalId).toBeNull();
    expect(week.tasks[0].weeklyGoalId).toBe(wg.data.id);

    await weeklyGoalById.DELETE(req("DELETE"), ctx({ id: wg.data.id }));
    week = await (await weeks.GET(req("GET"), ctx({ weekStart: WEEK }))).json();
    expect(week.weeklyGoals).toHaveLength(0);
    expect(week.tasks).toHaveLength(1);
    expect(week.tasks[0]).toMatchObject({ id: task.data.id, weeklyGoalId: null });
  });
});

describe("progress and week", () => {
  it("computes weekly progress and per-goal progress", async () => {
    const goal = await post<Id>(goals.POST, { title: "Fitness" });
    const wg = await post<Id>(weeklyGoals.POST, { weekStart: WEEK, title: "run", goalId: goal.data.id });
    const ids: string[] = [];
    for (let i = 0; i < 4; i++) {
      ids.push((await post<Id>(tasks.POST, { weekStart: WEEK, title: `t${i}`, weeklyGoalId: wg.data.id })).data.id);
    }
    await taskById.PATCH(req("PATCH", { status: "done" }), ctx({ id: ids[0] }));

    const week = await (await weeks.GET(req("GET"), ctx({ weekStart: WEEK }))).json();
    expect(week.progress).toBe(25);

    const list = await (await goals.GET(req("GET", undefined, "http://localhost/api/goals?withProgress=1"))).json();
    expect(list[0]).toMatchObject({ title: "Fitness", progress: 25 });
  });

  it("saves memo and retrospective and restores them", async () => {
    const put = await weeks.PUT(req("PUT", { memo: "focus", retrospective: "ok week" }), ctx({ weekStart: WEEK }));
    expect(put.status).toBe(200);
    await weeks.PUT(req("PUT", { memo: "focus 2" }), ctx({ weekStart: WEEK }));
    const week = await (await weeks.GET(req("GET"), ctx({ weekStart: WEEK }))).json();
    expect(week).toMatchObject({ memo: "focus 2", retrospective: "ok week", progress: 0 });
  });

  it("rejects non-Monday weeks", async () => {
    expect((await weeks.GET(req("GET"), ctx({ weekStart: "2026-10-06" }))).status).toBe(400);
  });
});

describe("goals", () => {
  it("creates, edits description, lists", async () => {
    const created = await post<Id>(goals.POST, { title: "Learn TS", description: "daily" });
    expect(created.status).toBe(201);
    const patched = await goalById.PATCH(req("PATCH", { description: "weekly" }), ctx({ id: created.data.id }));
    expect((await patched.json()).description).toBe("weekly");
    const list = await (await goals.GET(req("GET"))).json();
    expect(list).toHaveLength(1);
  });
});

const asUser = async <T>(userId: string | null, fn: () => Promise<T>): Promise<T> => {
  const previous = session.userId;
  session.userId = userId;
  try {
    return await fn();
  } finally {
    session.userId = previous;
  }
};

describe("authentication", () => {
  it("returns 401 for every endpoint without a session and creates nothing", async () => {
    const id = new mongoose.Types.ObjectId().toString();
    const responses = await asUser(null, () =>
      Promise.all([
        goals.GET(req("GET")),
        goals.POST(req("POST", { title: "x" })),
        goalById.PATCH(req("PATCH", { title: "x" }), ctx({ id })),
        goalById.DELETE(req("DELETE"), ctx({ id })),
        weeklyGoals.POST(req("POST", { weekStart: WEEK, title: "x" })),
        weeklyGoalById.PATCH(req("PATCH", { title: "x" }), ctx({ id })),
        weeklyGoalById.DELETE(req("DELETE"), ctx({ id })),
        tasks.GET(req("GET")),
        tasks.POST(req("POST", { weekStart: WEEK, title: "x" })),
        taskById.PATCH(req("PATCH", { title: "x" }), ctx({ id })),
        taskById.DELETE(req("DELETE"), ctx({ id })),
        weeks.GET(req("GET"), ctx({ weekStart: WEEK })),
        weeks.PUT(req("PUT", { memo: "x" }), ctx({ weekStart: WEEK })),
      ]),
    );
    expect(responses.map((r) => r.status)).toEqual(Array(13).fill(401));
    expect(await mongoose.connection.db!.collection("goals").countDocuments()).toBe(0);
    expect(await mongoose.connection.db!.collection("tasks").countDocuments()).toBe(0);
  });
});

describe("per-user isolation", () => {
  async function seedAlice() {
    const goal = await post<Id>(goals.POST, { title: "Alice goal" });
    const wg = await post<Id>(weeklyGoals.POST, { weekStart: WEEK, title: "Alice weekly", goalId: goal.data.id });
    const task = await post<Id>(tasks.POST, { weekStart: WEEK, title: "Alice task", weeklyGoalId: wg.data.id });
    await weeks.PUT(req("PUT", { memo: "alice memo" }), ctx({ weekStart: WEEK }));
    return { goal: goal.data.id, wg: wg.data.id, task: task.data.id };
  }

  it("hides one user's data from another", async () => {
    await seedAlice();
    await asUser("github:bob", async () => {
      expect(await (await goals.GET(req("GET", undefined, "http://localhost/api/goals?withProgress=1"))).json()).toEqual([]);
      expect(await (await tasks.GET(req("GET"))).json()).toEqual([]);
      const week = await (await weeks.GET(req("GET"), ctx({ weekStart: WEEK }))).json();
      expect(week).toMatchObject({ memo: "", weeklyGoals: [], tasks: [], progress: 0 });
    });
  });

  it("returns 404 when another user touches someone else's records, and leaves them intact", async () => {
    const ids = await seedAlice();
    await asUser("github:bob", async () => {
      expect((await goalById.PATCH(req("PATCH", { title: "hacked" }), ctx({ id: ids.goal }))).status).toBe(404);
      expect((await goalById.DELETE(req("DELETE"), ctx({ id: ids.goal }))).status).toBe(404);
      expect((await weeklyGoalById.PATCH(req("PATCH", { title: "hacked" }), ctx({ id: ids.wg }))).status).toBe(404);
      expect((await weeklyGoalById.DELETE(req("DELETE"), ctx({ id: ids.wg }))).status).toBe(404);
      expect((await taskById.PATCH(req("PATCH", { status: "done" }), ctx({ id: ids.task }))).status).toBe(404);
      expect((await taskById.DELETE(req("DELETE"), ctx({ id: ids.task }))).status).toBe(404);
    });
    const week = await (await weeks.GET(req("GET"), ctx({ weekStart: WEEK }))).json();
    expect(week.weeklyGoals[0]).toMatchObject({ title: "Alice weekly", goalId: ids.goal });
    expect(week.tasks[0]).toMatchObject({ title: "Alice task", status: "todo", weeklyGoalId: ids.wg });
    expect(week.memo).toBe("alice memo");
    expect((await (await goals.GET(req("GET"))).json())[0].title).toBe("Alice goal");
  });

  it("rejects links to another user's goals and weekly goals", async () => {
    const ids = await seedAlice();
    await asUser("github:bob", async () => {
      expect((await post(weeklyGoals.POST, { weekStart: WEEK, title: "x", goalId: ids.goal })).status).toBe(400);
      expect((await post(tasks.POST, { weekStart: WEEK, title: "x", weeklyGoalId: ids.wg })).status).toBe(400);
      const own = await post<Id>(tasks.POST, { weekStart: WEEK, title: "bob task" });
      expect((await taskById.PATCH(req("PATCH", { weeklyGoalId: ids.wg }), ctx({ id: own.data.id }))).status).toBe(400);
      const ownWg = await post<Id>(weeklyGoals.POST, { weekStart: WEEK, title: "bob weekly" });
      expect((await weeklyGoalById.PATCH(req("PATCH", { goalId: ids.goal }), ctx({ id: ownWg.data.id }))).status).toBe(400);
    });
  });

  it("applies the 5-goal cap and the week memo per user", async () => {
    for (const user of ["github:alice", "github:bob"]) {
      await asUser(user, async () => {
        const results = await Promise.all(Array.from({ length: 7 }, (_, i) => post(weeklyGoals.POST, { weekStart: WEEK, title: `${user}-${i}` })));
        expect(results.filter((r) => r.status === 201)).toHaveLength(5);
        expect((await post(weeklyGoals.POST, { weekStart: WEEK, title: "one more" })).status).toBe(400);
        await weeks.PUT(req("PUT", { memo: `memo of ${user}` }), ctx({ weekStart: WEEK }));
      });
    }
    for (const user of ["github:alice", "github:bob"]) {
      await asUser(user, async () => {
        const week = await (await weeks.GET(req("GET"), ctx({ weekStart: WEEK }))).json();
        expect(week.weeklyGoals).toHaveLength(5);
        expect(week.memo).toBe(`memo of ${user}`);
      });
    }
  });
});
