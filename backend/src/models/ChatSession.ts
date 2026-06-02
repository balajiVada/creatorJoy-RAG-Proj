import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface IChatSession extends MongooseDocument {
  title?: string;
  comparisonSessionId: mongoose.Types.ObjectId;
  messageCount: number;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ChatSessionSchema = new Schema<IChatSession>(
  {
    title: { type: String },
    comparisonSessionId: { type: Schema.Types.ObjectId, ref: 'ComparisonSession', required: true },
    messageCount: { type: Number, default: 0 },
    lastMessageAt: { type: Date },
  },
  { timestamps: true }
);

ChatSessionSchema.index({ comparisonSessionId: 1 });

export const ChatSession = mongoose.model<IChatSession>('ChatSession', ChatSessionSchema);
