import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { connectDB } from './config/db';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5005;

// Middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'creatorJoy-RAG Backend is running' });
});

// Error handling middleware
app.use(errorHandler);

import { initPinecone } from './config/pinecone';

// Start server
const startServer = async () => {
  await connectDB();
  await initPinecone();
  
  app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
  });
};

startServer();
