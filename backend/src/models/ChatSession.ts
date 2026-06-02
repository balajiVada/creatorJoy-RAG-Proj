import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface IChatSession extends MongooseDocument {
  title?: string;
  ingestedVideos: { url: string; metadataId: mongoose.Types.ObjectId }[];
  messageCount: number;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ChatSessionSchema = new Schema<IChatSession>(
  {
    title: { type: String },
    ingestedVideos: [{
      url: { type: String, required: true },
      metadataId: { type: Schema.Types.ObjectId, ref: 'VideoMetadata' }
    }],
    messageCount: { type: Number, default: 0 },
    lastMessageAt: { type: Date },
  },
  { timestamps: true }
);

export const ChatSession = mongoose.model<IChatSession>('ChatSession', ChatSessionSchema);
