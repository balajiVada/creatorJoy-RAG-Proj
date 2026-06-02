const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

export const createSession = async (videoAUrl: string, videoBUrl: string) => {
  const response = await fetch(`${API_URL}/sessions/compare`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ videoAUrl, videoBUrl }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to create comparison session');
  }

  return data.data;
};

export const getSession = async (id: string) => {
  const response = await fetch(`${API_URL}/sessions/${id}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message);
  return data.data;
};

export const extractSession = async (id: string) => {
  const response = await fetch(`${API_URL}/sessions/${id}/extract`, { method: 'POST' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message);
  return data.data;
};
