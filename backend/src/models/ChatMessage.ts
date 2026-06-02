import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface IChatMessage extends MongooseDocument {
  chatSessionId: mongoose.Types.ObjectId;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: any[];
  retrievalMetadata?: {
    originalQuery?: string;
    rewrittenQuery?: string;
    retrievalLatency?: number;
    rewriteLatency?: number;
    generationLatency?: number;
    tokenUsage?: number;
    model?: string;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    chatSessionId: { type: Schema.Types.ObjectId, ref: 'ChatSession', required: true },
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    citations: { type: Schema.Types.Mixed },
    retrievalMetadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

ChatMessageSchema.index({ chatSessionId: 1, createdAt: 1 });

export const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);
