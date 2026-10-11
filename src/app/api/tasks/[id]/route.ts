import { z } from "zod";
import { error, handle, isObjectId, json, parseBody, serializeTask, taskFields } from "@/lib/api";
import { Task } from "@/models/Task";
import { WeeklyGoal } from "@/models/WeeklyGoal";

type Ctx = { params: Promise<{ id: string }> };

const patchInput = taskFields.partial().extend({ order: z.number().optional() });

export const PATCH = handle(async (userId, req: Request, { params }: Ctx) => {
  const { id } = await params;
  if (!isObjectId(id)) return error("Invalid id", 400);
  const body = await parseBody(req, patchInput);
  const existing = await Task.findOne({ _id: id, userId }).lean();
  if (!existing) return error("Task not found", 404);
  if (body.weeklyGoalId && !(await WeeklyGoal.exists({ _id: body.weeklyGoalId, userId, weekStart: existing.weekStart }))) {
    return error("weeklyGoalId does not reference a weekly goal of the same week", 400);
  }
  const task = await Task.findOneAndUpdate({ _id: id, userId }, body, { returnDocument: "after", runValidators: true }).lean();
  return task ? json(serializeTask(task)) : error("Task not found", 404);
});

export const DELETE = handle(async (userId, _req: Request, { params }: Ctx) => {
  const { id } = await params;
  if (!isObjectId(id)) return error("Invalid id", 400);
  const task = await Task.findOneAndDelete({ _id: id, userId }).lean();
  return task ? json({ ok: true }) : error("Task not found", 404);
});
