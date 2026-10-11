import { error, handle, json, parseBody, serializeTask, taskFields, weekStartSchema } from "@/lib/api";
import { Task } from "@/models/Task";
import { WeeklyGoal } from "@/models/WeeklyGoal";

const input = taskFields.extend({ weekStart: weekStartSchema });

export const GET = handle(async (userId, req: Request) => {
  const weekStart = new URL(req.url).searchParams.get("weekStart");
  const filter = weekStart ? { userId, weekStart } : { userId };
  const tasks = await Task.find(filter).sort({ order: 1, createdAt: 1 }).lean();
  return json(tasks.map(serializeTask));
});

export const POST = handle(async (userId, req: Request) => {
  const body = await parseBody(req, input);
  if (body.weeklyGoalId && !(await WeeklyGoal.exists({ _id: body.weeklyGoalId, userId, weekStart: body.weekStart }))) {
    return error("weeklyGoalId does not reference a weekly goal of the same week", 400);
  }
  const last = await Task.findOne({ userId, weekStart: body.weekStart }).sort({ order: -1 }).lean();
  const task = await Task.create({ ...body, userId, order: (last?.order ?? 0) + 1000 });
  return json(serializeTask(task.toObject()), 201);
});
