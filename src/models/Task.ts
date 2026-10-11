import mongoose, { type InferSchemaType, type Model } from "mongoose";

const TaskSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    weekStart: { type: String, required: true, index: true },
    weeklyGoalId: { type: mongoose.Schema.Types.ObjectId, ref: "WeeklyGoal", default: null },
    day: { type: Number, min: 0, max: 6, default: null },
    title: { type: String, required: true, trim: true },
    status: { type: String, enum: ["todo", "doing", "done"], default: "todo" },
    priority: { type: String, enum: ["High", "Medium", "Low"], default: "Medium" },
    dueDate: { type: String, default: null },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type TaskDoc = InferSchemaType<typeof TaskSchema>;
export const Task: Model<TaskDoc> = mongoose.models.Task ?? mongoose.model<TaskDoc>("Task", TaskSchema);
