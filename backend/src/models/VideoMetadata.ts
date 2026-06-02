import mongoose, { Schema, Document } from 'mongoose';

export interface IVideoMetadata extends Document {
  url: string;
  platform: 'youtube' | 'instagram';
  chatSessionId: mongoose.Types.ObjectId;
  transcript?: string;
  views?: number;
  likes?: number;
  comments?: number;
  engagementRate?: number;
  extractionStatus: 'pending' | 'success' | 'failed';
  extractedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VideoMetadataSchema = new Schema<IVideoMetadata>(
  {
    url: { type: String, required: true },
    platform: { type: String, enum: ['youtube', 'instagram'], required: true },
    chatSessionId: { type: Schema.Types.ObjectId, ref: 'ChatSession', required: true },
    transcript: { type: String },
    views: { type: Number },
    likes: { type: Number },
    comments: { type: Number },
    engagementRate: { type: Number },
    extractionStatus: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
    extractedAt: { type: Date },
  },
  { timestamps: true }
);

export const VideoMetadata = mongoose.model<IVideoMetadata>('VideoMetadata', VideoMetadataSchema);
