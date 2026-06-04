# CreatorJoy RAG Chatbot: Video Performance Copilot

This project is a Full-Stack Retrieval-Augmented Generation (RAG) chatbot designed to help content creators compare, analyze, and optimize their social media video performance. 

By taking a YouTube video URL and an Instagram Reel URL, the system dynamically extracts their transcripts and statistics, computes engagement rates, indexes the content into a vector database, and opens a streaming chat panel. Creators can ask questions to compare hooks, metrics, and content-level performance between the two videos.

---

## 🌟 Key Features

* **Dual Platform Ingestion:** Supports YouTube URLs (including Shorts) and Instagram Reels.
* **Audio-to-Text Transcription:** Uses AssemblyAI to transcribe spoken audio directly from Instagram Reels, bypassing low-signal text captions.
* **Side-by-Side Video Cards:** Renders views, likes, comments, and follower counts side-by-side dynamically.
* **RAG Conversational Interface:** Answers complex comparison questions, provides source citations with hoverable transcript snippets, and maintains sliding window memory.
* **Intent-Based Routing:** Optimizes speed and costs by routing statistical questions directly to MongoDB and content questions to Pinecone.
* **Observability Console:** Includes a live **AI Pipeline Inspector** tracking token usage, latency, and similarity scores.
* **12-Hour Cache TTL:** Reuses static transcripts and vector embeddings long-term while refreshing volatile engagement metrics automatically.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React, Vite, TypeScript, Tailwind CSS, Lucide Icons |
| **Backend API** | Node.js, Express, TypeScript, MongoDB (Mongoose) |
| **Worker Queue** | Redis, BullMQ |
| **Vector Database** | Pinecone |
| **Orchestration** | LangChain (Azure OpenAI GPT-4o-mini) |
| **Embeddings** | Gemini API (`gemini-embedding-2`) |
| **Transcription** | AssemblyAI API, `youtube-transcript-api` |

---

## 📁 Project Structure

```text
├── Docs/                        # Project requirements, proposed architecture, and walkthrough logs
├── backend/                     # Express API & BullMQ Background Ingestion Workers
│   ├── src/
│   │   ├── config/              # MongoDB & Pinecone clients
│   │   ├── controllers/         # Chat and SSE stream handlers
│   │   ├── services/            # Scraping, chunking, and LangChain setup
│   │   ├── workers/             # Ingestion worker processors
│   │   └── index.ts             # API entrypoint
│   ├── .env.example             # Template for API keys
│   └── package.json
└── frontend/                    # Vite React application
    ├── src/
    │   ├── components/          # Video cards, comparison views, and custom tooltips
    │   ├── pages/               # Main Chat Page UI
    │   └── stores/              # Zustand state managers
    └── package.json
```

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18 or higher)
* **MongoDB** (running locally or a remote MongoDB Atlas URI)
* **Redis** (running locally or a remote Redis URL, required for BullMQ queues)

---

### Installation & Configuration

#### 1. Clone the repository
```bash
git clone https://github.com/balajiVada/creatorJoy-RAG-Proj.git
cd creatorJoy-RAG-Proj
```

#### 2. Set up the Backend
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Fill in the required API keys in `.env`:
   ```env
   PORT=5005
   FRONTEND_URL=http://localhost:5173
   MONGODB_URI=mongodb://localhost:27017/creatorjoy-rag
   REDIS_URL=redis://localhost:6379

   AZURE_OPENAI_API_KEY=your_key
   AZURE_OPENAI_ENDPOINT=your_endpoint
   AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
   GEMINI_API_KEY=your_key
   PINECONE_API_KEY=your_key
   PINECONE_INDEX=creatorjoy-rag
   ASSEMBLYAI_API_KEY=your_key
   RAPID_API_KEY=your_key
   YOUTUBE_API_KEY=your_key
   ```

#### 3. Set up the Frontend
1. Navigate to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

---

## ⚙️ Running the Application

1. Make sure **MongoDB** and **Redis** are running locally.
2. In the `backend/` directory, start the API server and ingestion workers:
   ```bash
   npm run dev
   ```
3. In the `frontend/` directory, start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:5173`.
