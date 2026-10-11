import { z } from "zod";
import { handle, json, parseBody, serializeGoal, serializeTask, serializeWeeklyGoal } from "@/lib/api";
import { goalProgress } from "@/lib/progress";
import { Goal } from "@/models/Goal";
import { Task } from "@/models/Task";
import { WeeklyGoal } from "@/models/WeeklyGoal";

const goalInput = z.object({
  title: z.string().trim().min(1),
  description: z.string().optional(),
  year: z.number().int().min(2000).max(2200).optional(),
});

export const GET = handle(async (userId, req: Request) => {
  const withProgress = new URL(req.url).searchParams.get("withProgress") === "1";
  const goals = (await Goal.find({ userId }).sort({ createdAt: 1 }).lean()).map(serializeGoal);
  if (!withProgress) return json(goals);
  const weeklyGoals = (await WeeklyGoal.find({ userId }).lean()).map(serializeWeeklyGoal);
  const tasks = (await Task.find({ userId }).lean()).map(serializeTask);
  return json(goals.map((g) => ({ ...g, progress: goalProgress(g.id, weeklyGoals, tasks) })));
});

export const POST = handle(async (userId, req: Request) => {
  const body = await parseBody(req, goalInput);
  const goal = await Goal.create({ ...body, year: body.year ?? new Date().getFullYear(), userId });
  return json(serializeGoal(goal.toObject()), 201);
});
