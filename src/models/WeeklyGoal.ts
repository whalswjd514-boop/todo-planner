import mongoose, { type InferSchemaType, type Model } from "mongoose";

const WeeklyGoalSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    weekStart: { type: String, required: true },
    goalId: { type: mongoose.Schema.Types.ObjectId, ref: "Goal", default: null },
    title: { type: String, required: true, trim: true },
    // One of 0..4. The unique index below makes "at most 5 goals per week" a database guarantee.
    slot: { type: Number, required: true, min: 0, max: 4 },
  },
  { timestamps: true },
);
WeeklyGoalSchema.index({ userId: 1, weekStart: 1, slot: 1 }, { unique: true });

export type WeeklyGoalDoc = InferSchemaType<typeof WeeklyGoalSchema>;
export const WeeklyGoal: Model<WeeklyGoalDoc> =
  mongoose.models.WeeklyGoal ?? mongoose.model<WeeklyGoalDoc>("WeeklyGoal", WeeklyGoalSchema);
