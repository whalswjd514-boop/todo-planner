import { z } from "zod";
import { error, handle, json, MAX_WEEKLY_GOALS, objectIdSchema, parseBody, serializeWeeklyGoal, weekStartSchema } from "@/lib/api";
import { Goal } from "@/models/Goal";
import { WeeklyGoal } from "@/models/WeeklyGoal";

const input = z.object({
  weekStart: weekStartSchema,
  title: z.string().trim().min(1),
  goalId: objectIdSchema.nullable().optional(),
});

const DUPLICATE_KEY = 11000;

export const POST = handle(async (userId, req: Request) => {
  const body = await parseBody(req, input);
  if (body.goalId && !(await Goal.exists({ _id: body.goalId, userId }))) {
    return error("goalId does not reference an existing goal", 400);
  }
  // Claim the first free slot; the unique (userId, weekStart, slot) index rejects concurrent claims.
  for (let slot = 0; slot < MAX_WEEKLY_GOALS; slot++) {
    try {
      const wg = await WeeklyGoal.create({ ...body, goalId: body.goalId ?? null, userId, slot });
      return json(serializeWeeklyGoal(wg.toObject()), 201);
    } catch (e) {
      if ((e as { code?: number }).code !== DUPLICATE_KEY) throw e;
    }
  }
  return error(`A week can have at most ${MAX_WEEKLY_GOALS} goals`, 400);
});
