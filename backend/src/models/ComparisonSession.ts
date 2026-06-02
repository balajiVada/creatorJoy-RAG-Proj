import mongoose, { Schema, Document } from 'mongoose';

export interface IComparisonSession extends Document {
  videoAId: mongoose.Types.ObjectId;
  videoBId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ComparisonSessionSchema = new Schema(
  {
    videoAId: { type: Schema.Types.ObjectId, ref: 'VideoMetadata', required: true },
    videoBId: { type: Schema.Types.ObjectId, ref: 'VideoMetadata', required: true },
  },
  { timestamps: true }
);

export const ComparisonSession = mongoose.model<IComparisonSession>('ComparisonSession', ComparisonSessionSchema);
