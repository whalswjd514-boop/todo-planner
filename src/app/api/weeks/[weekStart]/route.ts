import { z } from "zod";
import { error, handle, json, parseBody, serializeTask, serializeWeeklyGoal, weekStartSchema } from "@/lib/api";
import { taskProgress } from "@/lib/progress";
import { Task } from "@/models/Task";
import { WeeklyGoal } from "@/models/WeeklyGoal";
import { WeeklyPlan } from "@/models/WeeklyPlan";

type Ctx = { params: Promise<{ weekStart: string }> };

const putInput = z.object({
  memo: z.string().optional(),
  retrospective: z.string().optional(),
});

export const GET = handle(async (userId, _req: Request, { params }: Ctx) => {
  const { weekStart } = await params;
  if (!weekStartSchema.safeParse(weekStart).success) return error("weekStart must be a Monday (YYYY-MM-DD)", 400);
  const [plan, weeklyGoals, tasks] = await Promise.all([
    WeeklyPlan.findOne({ userId, weekStart }).lean(),
    WeeklyGoal.find({ userId, weekStart }).sort({ createdAt: 1 }).lean(),
    Task.find({ userId, weekStart }).sort({ order: 1, createdAt: 1 }).lean(),
  ]);
  const serializedTasks = tasks.map(serializeTask);
  return json({
    weekStart,
    memo: plan?.memo ?? "",
    retrospective: plan?.retrospective ?? "",
    weeklyGoals: weeklyGoals.map(serializeWeeklyGoal),
    tasks: serializedTasks,
    progress: taskProgress(serializedTasks),
  });
});

export const PUT = handle(async (userId, req: Request, { params }: Ctx) => {
  const { weekStart } = await params;
  if (!weekStartSchema.safeParse(weekStart).success) return error("weekStart must be a Monday (YYYY-MM-DD)", 400);
  const body = await parseBody(req, putInput);
  const plan = await WeeklyPlan.findOneAndUpdate(
    { userId, weekStart },
    { $set: body, $setOnInsert: { userId, weekStart } },
    { returnDocument: "after", upsert: true },
  ).lean();
  return json({ weekStart, memo: plan.memo ?? "", retrospective: plan.retrospective ?? "" });
});
