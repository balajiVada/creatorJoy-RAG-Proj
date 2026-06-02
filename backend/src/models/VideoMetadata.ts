import mongoose, { Schema, Document } from 'mongoose';

export interface IVideoMetadata extends Document {
  source: 'youtube' | 'instagram';
  url: string;
  creatorName?: string;
  views?: number;
  likes?: number;
  comments?: number;
  followerCount?: number;
  engagementRate?: number;
  transcript?: string;
  duration?: number;
  uploadDate?: Date;
  hashtags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const VideoMetadataSchema = new Schema(
  {
    source: { type: String, enum: ['youtube', 'instagram'], required: true },
    url: { type: String, required: true },
    creatorName: { type: String },
    views: { type: Number },
    likes: { type: Number },
    comments: { type: Number },
    followerCount: { type: Number },
    engagementRate: { type: Number },
    transcript: { type: String },
    duration: { type: Number },
    uploadDate: { type: Date },
    hashtags: [{ type: String }],
  },
  { timestamps: true }
);

export const VideoMetadata = mongoose.model<IVideoMetadata>('VideoMetadata', VideoMetadataSchema);
