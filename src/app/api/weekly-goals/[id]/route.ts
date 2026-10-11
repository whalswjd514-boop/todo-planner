import { z } from "zod";
import { error, handle, isObjectId, json, objectIdSchema, parseBody, serializeWeeklyGoal } from "@/lib/api";
import { Goal } from "@/models/Goal";
import { Task } from "@/models/Task";
import { WeeklyGoal } from "@/models/WeeklyGoal";

type Ctx = { params: Promise<{ id: string }> };

const patchInput = z.object({
  title: z.string().trim().min(1).optional(),
  goalId: objectIdSchema.nullable().optional(),
});

export const PATCH = handle(async (userId, req: Request, { params }: Ctx) => {
  const { id } = await params;
  if (!isObjectId(id)) return error("Invalid id", 400);
  const body = await parseBody(req, patchInput);
  if (body.goalId && !(await Goal.exists({ _id: body.goalId, userId }))) {
    return error("goalId does not reference an existing goal", 400);
  }
  const wg = await WeeklyGoal.findOneAndUpdate({ _id: id, userId }, body, { returnDocument: "after", runValidators: true }).lean();
  return wg ? json(serializeWeeklyGoal(wg)) : error("Weekly goal not found", 404);
});

export const DELETE = handle(async (userId, _req: Request, { params }: Ctx) => {
  const { id } = await params;
  if (!isObjectId(id)) return error("Invalid id", 400);
  if (!(await WeeklyGoal.exists({ _id: id, userId }))) return error("Weekly goal not found", 404);
  // Unlink first so a failure never leaves tasks pointing at a deleted weekly goal.
  await Task.updateMany({ userId, weeklyGoalId: id }, { $set: { weeklyGoalId: null } });
  await WeeklyGoal.deleteOne({ _id: id, userId });
  return json({ ok: true });
});
