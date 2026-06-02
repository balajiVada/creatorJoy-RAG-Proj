import mongoose, { Schema, Document } from 'mongoose';

export interface IVideoMetadata extends Document {
  source: 'youtube' | 'instagram';
  url: string;
  transcript?: string;
  views?: number;
  likes?: number;
  comments?: number;
  engagementRate?: number;
  extractionStatus: 'pending' | 'success' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const VideoMetadataSchema: Schema = new Schema(
  {
    source: { type: String, enum: ['youtube', 'instagram'], required: true },
    url: { type: String, required: true },
    transcript: { type: String },
    views: { type: Number },
    likes: { type: Number },
    comments: { type: Number },
    engagementRate: { type: Number },
    extractionStatus: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
  },
  { timestamps: true }
);

export const VideoMetadata = mongoose.model<IVideoMetadata>('VideoMetadata', VideoMetadataSchema);
