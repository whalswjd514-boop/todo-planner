import mongoose from "mongoose";
import { z, ZodError, type ZodType } from "zod";
import { connectDB } from "@/lib/db";
import { getUserId } from "@/lib/session";
import { isDateString, isWeekStart } from "@/lib/week";

export const MAX_WEEKLY_GOALS = 5;

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export function error(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

export function isObjectId(id: string): boolean {
  return mongoose.isValidObjectId(id) && /^[0-9a-fA-F]{24}$/.test(id);
}

/** zod schema for a Mongo ObjectId string; use `.nullable().optional()` for link fields. */
export const objectIdSchema = z.string().refine(isObjectId, "invalid id");

export const weekStartSchema = z.string().refine(isWeekStart, "weekStart must be a Monday (YYYY-MM-DD)");

/** Task fields shared by create (POST) and update (PATCH, via .partial()). */
export const taskFields = z.object({
  title: z.string().trim().min(1),
  weeklyGoalId: objectIdSchema.nullable().optional(),
  day: z.number().int().min(0).max(6).nullable().optional(),
  status: z.enum(["todo", "doing", "done"]).optional(),
  priority: z.enum(["High", "Medium", "Low"]).optional(),
  dueDate: z.string().refine(isDateString, "dueDate must be a valid YYYY-MM-DD date").nullable().optional(),
});

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError("Invalid JSON body", 400);
  }
  return schema.parse(raw);
}

export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/**
 * Wraps a handler: requires a signed-in user (401 otherwise, before any DB access), connects to the DB
 * and maps validation/HTTP errors to JSON responses. The handler receives the session user id first.
 */
export function handle<A extends unknown[]>(fn: (userId: string, ...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      const userId = await getUserId();
      if (!userId) return error("Unauthorized", 401);
      try {
        await connectDB();
      } catch (e) {
        console.error(e);
        return error(`Database connection failed: ${e instanceof Error ? e.message : "unknown error"}`, 503);
      }
      return await fn(userId, ...args);
    } catch (e) {
      if (e instanceof HttpError) return error(e.message, e.status);
      if (e instanceof ZodError) return error(e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), 400);
      if (e instanceof mongoose.Error.CastError || e instanceof mongoose.Error.ValidationError) return error(e.message, 400);
      console.error(e);
      return error("Internal server error", 500);
    }
  };
}

type WithId = { _id: unknown };
const str = (v: unknown) => (v == null ? null : String(v));

export function serializeGoal(g: WithId & { title: string; description?: string | null; year: number }) {
  return { id: String(g._id), title: g.title, description: g.description ?? "", year: g.year };
}

export function serializeWeeklyGoal(w: WithId & { title: string; weekStart: string; goalId?: unknown }) {
  return { id: String(w._id), title: w.title, weekStart: w.weekStart, goalId: str(w.goalId) };
}

export function serializeTask(
  t: WithId & {
    title: string;
    weekStart: string;
    weeklyGoalId?: unknown;
    day?: number | null;
    status: "todo" | "doing" | "done";
    priority: "High" | "Medium" | "Low";
    dueDate?: string | null;
    order?: number | null;
  },
) {
  return {
    id: String(t._id),
    title: t.title,
    weekStart: t.weekStart,
    weeklyGoalId: str(t.weeklyGoalId),
    day: t.day ?? null,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate ?? null,
    order: t.order ?? 0,
  };
}
