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
  title?: string;
  thumbnail?: string;
  creatorName?: string;
  followerCount?: number;
  hashtags?: string[];
  uploadDate?: Date;
  duration?: string;
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
    title: { type: String },
    thumbnail: { type: String },
    creatorName: { type: String },
    followerCount: { type: Number },
    hashtags: [{ type: String }],
    uploadDate: { type: Date },
    duration: { type: String },
  },
  { timestamps: true }
);

export const VideoMetadata = mongoose.model<IVideoMetadata>('VideoMetadata', VideoMetadataSchema);
