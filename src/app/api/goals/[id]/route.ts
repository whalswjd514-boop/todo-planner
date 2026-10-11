import { z } from "zod";
import { error, handle, isObjectId, json, parseBody, serializeGoal } from "@/lib/api";
import { Goal } from "@/models/Goal";
import { WeeklyGoal } from "@/models/WeeklyGoal";

type Ctx = { params: Promise<{ id: string }> };

const patchInput = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().optional(),
  year: z.number().int().min(2000).max(2200).optional(),
});

export const PATCH = handle(async (userId, req: Request, { params }: Ctx) => {
  const { id } = await params;
  if (!isObjectId(id)) return error("Invalid id", 400);
  const body = await parseBody(req, patchInput);
  const goal = await Goal.findOneAndUpdate({ _id: id, userId }, body, { returnDocument: "after", runValidators: true }).lean();
  return goal ? json(serializeGoal(goal)) : error("Goal not found", 404);
});

export const DELETE = handle(async (userId, _req: Request, { params }: Ctx) => {
  const { id } = await params;
  if (!isObjectId(id)) return error("Invalid id", 400);
  if (!(await Goal.exists({ _id: id, userId }))) return error("Goal not found", 404);
  // Unlink first so a failure never leaves weekly goals pointing at a deleted goal.
  await WeeklyGoal.updateMany({ userId, goalId: id }, { $set: { goalId: null } });
  await Goal.deleteOne({ _id: id, userId });
  return json({ ok: true });
});
