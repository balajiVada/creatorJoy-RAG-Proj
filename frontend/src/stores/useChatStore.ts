import { create } from 'zustand';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

export interface ChatSession {
  _id: string;
  title: string;
  messageCount: number;
  updatedAt: string;
}

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  isLoadingSessions: boolean;
  
  fetchSessions: () => Promise<void>;
  createSession: () => Promise<string>;
  setActiveSession: (id: string | null) => void;
  deleteSession: (id: string) => Promise<void>;
  renameSession: (id: string, title: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set) => ({
  sessions: [],
  activeSessionId: null,
  isLoadingSessions: false,

  fetchSessions: async () => {
    set({ isLoadingSessions: true });
    try {
      const response = await fetch(`${API_URL}/chat/sessions`);
      const data = await response.json();
      set({ sessions: data });
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      set({ isLoadingSessions: false });
    }
  },

  createSession: async () => {
    try {
      const response = await fetch(`${API_URL}/chat/sessions`, { method: 'POST' });
      const newSession = await response.json();
      set(state => ({
        sessions: [newSession, ...state.sessions],
        activeSessionId: newSession._id,
      }));
      return newSession._id;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  },

  setActiveSession: (id) => {
    set({ activeSessionId: id });
  },

  deleteSession: async (id) => {
    try {
      await fetch(`${API_URL}/chat/sessions/${id}`, { method: 'DELETE' });
      set(state => {
        const newSessions = state.sessions.filter(s => s._id !== id);
        return {
          sessions: newSessions,
          activeSessionId: state.activeSessionId === id ? null : state.activeSessionId
        };
      });
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  },

  renameSession: async () => {
    // not implemented on backend for this sprint
  }
}));
