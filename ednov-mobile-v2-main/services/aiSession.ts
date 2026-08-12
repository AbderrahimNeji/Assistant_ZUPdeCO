import { Platform } from 'react-native';

import api from '@/services/api';
import { auth } from '@/lib/firebase';
import { env } from '@/config/env';

export interface PedagogicalResource {
  title: string;
  problem: string;
  solution: string;
}

export interface GenerateCrFromRecordingResponse {
  reportId: string;
  transcript: string;
  /** AI-generated dialogue with [Tuteur]/[Élève] labels (optional for backward compatibility). */
  generatedScript?: string;
  generatedComment: string;
  generatedResources: PedagogicalResource[];
}

/**
 * Upload session recording to backend for STT (French) and draft CR + pedagogical resources generation.
 * Requires env.apiUrl and backend POST /sessions/:sessionId/ai/generate-from-recording.
 *
 * Uses native fetch (not Axios) for the multipart upload because Axios's XMLHttpRequest
 * implementation does not handle React Native's { uri, type, name } file format in FormData.
 * Native fetch handles this format natively on iOS and Android.
 */
export async function generateCrFromRecording(
  sessionId: string,
  audioUri: string
): Promise<GenerateCrFromRecordingResponse> {
  if (!env.apiUrl?.trim()) {
    throw new Error('API URL is not configured');
  }

  const formData = new FormData();

  if (Platform.OS === 'web') {
    const blobResponse = await fetch(audioUri);
    if (!blobResponse.ok) {
      throw new Error(`Failed to read recording: ${blobResponse.status}`);
    }
    const blob = await blobResponse.blob();
    formData.append('audio', blob, 'recording.m4a');
  } else {
    // React Native: { uri, type, name } is the native file descriptor for fetch FormData.
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as unknown as Blob);
  }

  // Get Firebase auth token
  const headers: Record<string, string> = {};
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch {
      // proceed without token
    }
  }

  const url = `${env.apiUrl}/sessions/${sessionId}/ai/generate-from-recording`;
  if (__DEV__) {
    console.log('[aiSession] POST', url, { hasAuth: !!headers['Authorization'] });
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    // No Content-Type header: let fetch set multipart/form-data with the correct boundary
    body: formData,
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const errData = (await response.json()) as { message?: string };
      if (errData?.message) message = errData.message;
    } catch {
      // ignore JSON parse errors
    }
    const err = new Error(message) as Error & { status: number };
    err.status = response.status;
    throw err;
  }

  const data = (await response.json()) as GenerateCrFromRecordingResponse;
  return data;
}

export interface SessionChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SessionChatResponse {
  content: string;
}

export interface SessionChatHistoryResponse {
  messages: SessionChatMessage[];
}

/**
 * Load persisted chat history for a session.
 * Requires env.apiUrl and backend GET /ai/session-chat/history?sessionId=...
 */
export async function getSessionChatHistory(
  sessionId: string
): Promise<SessionChatMessage[]> {
  if (!env.apiUrl?.trim()) {
    return [];
  }
  const id = typeof sessionId === 'string' ? sessionId : Array.isArray(sessionId) ? sessionId[0] : String(sessionId);
  try {
    const { data } = await api.get<SessionChatHistoryResponse>(
      '/ai/session-chat/history',
      { params: { sessionId: id } }
    );
    return Array.isArray(data?.messages) ? data.messages : [];
  } catch {
    return [];
  }
}

/**
 * Send conversation to the session-scoped tutor AI assistant.
 * Requires env.apiUrl and backend POST /ai/session-chat (body: { sessionId, messages }).
 */
export async function sendSessionChatMessage(
  sessionId: string,
  messages: SessionChatMessage[]
): Promise<SessionChatResponse> {
  if (!env.apiUrl?.trim()) {
    throw new Error('API URL is not configured');
  }
  const id = typeof sessionId === 'string' ? sessionId : Array.isArray(sessionId) ? sessionId[0] : String(sessionId);
  const { data } = await api.post<SessionChatResponse>(
    '/ai/session-chat',
    { sessionId: id, messages }
  );
  return data;
}
