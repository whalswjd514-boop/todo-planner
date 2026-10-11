import mongoose, { type InferSchemaType, type Model } from "mongoose";

const GoalSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    year: { type: Number, required: true },
  },
  { timestamps: true },
);

export type GoalDoc = InferSchemaType<typeof GoalSchema>;
export const Goal: Model<GoalDoc> = mongoose.models.Goal ?? mongoose.model<GoalDoc>("Goal", GoalSchema);
