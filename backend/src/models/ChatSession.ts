import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface IChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  uiComponents?: {
    type: 'video_card' | 'comparison_view' | 'error_card';
    props: any;
  }[];
}

export interface IChatSession extends MongooseDocument {
  title?: string;
  messages: IChatMessage[];
  ingestedVideos: { url: string; metadataId: mongoose.Types.ObjectId }[];
  messageCount: number;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  uiComponents: [{
    type: { type: String, enum: ['video_card', 'comparison_view', 'error_card'] },
    props: { type: Schema.Types.Mixed }
  }]
});

const ChatSessionSchema = new Schema<IChatSession>(
  {
    title: { type: String },
    messages: [MessageSchema],
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
