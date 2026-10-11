import mongoose, { type InferSchemaType, type Model } from "mongoose";

const WeeklyPlanSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    weekStart: { type: String, required: true },
    memo: { type: String, default: "" },
    retrospective: { type: String, default: "" },
  },
  { timestamps: true },
);
WeeklyPlanSchema.index({ userId: 1, weekStart: 1 }, { unique: true });

export type WeeklyPlanDoc = InferSchemaType<typeof WeeklyPlanSchema>;
export const WeeklyPlan: Model<WeeklyPlanDoc> =
  mongoose.models.WeeklyPlan ?? mongoose.model<WeeklyPlanDoc>("WeeklyPlan", WeeklyPlanSchema);
