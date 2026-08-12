import { Platform } from 'react-native';

import { env, getWebApiMisconfigurationHint } from '@/config/env';
import { auth } from '@/lib/firebase';
import type { CriminalRecordInfo, TutorPlatformStatus } from '@/types/profile';
import api from '@/services/api';

export interface UploadCriminalRecordResponse {
  criminalRecord: CriminalRecordInfo;
  tutorPlatformStatus: TutorPlatformStatus;
}

async function authHeaders(): Promise<Record<string, string>> {
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
  return headers;
}

function normalizeUploadError(status: number, bodyText: string, jsonMessage?: string): string {
  if (status === 404 && /cannot post/i.test(bodyText)) {
    const webHint = getWebApiMisconfigurationHint();
    const base =
      'Réponse 404 sur le POST du casier : le client n’atteint pas Nest sur cette URL (ou le déploiement est ancien). ';
    if (webHint) return base + webHint;
    return (
      base +
      'Vérifiez EXPO_PUBLIC_API_URL (doit finir par /api/v1 et viser votre instance Nest). ' +
      'En local, POST /api/v1/users/me/criminal-record sans token doit répondre 401, pas 404.'
    );
  }
  if (jsonMessage) return jsonMessage;
  if (bodyText.trim()) return bodyText.trim().slice(0, 500);
  return `Request failed: ${status}`;
}

function parseAxiosUploadError(err: unknown): Error {
  const o = err as { status?: number; message?: string };
  const status = o.status ?? 0;
  const bodyText = o.message ?? '';
  const msg = normalizeUploadError(status, bodyText, undefined);
  const out = new Error(msg) as Error & { status?: number };
  out.status = status;
  return out;
}

/**
 * Multipart upload. Web: axios + same baseURL as the rest of the app. Native: fetch (RN file descriptor).
 */
export async function uploadCriminalRecordPdf(fileUri: string, fileName: string): Promise<UploadCriminalRecordResponse> {
  if (!env.apiUrl?.trim()) {
    throw new Error('API URL is not configured');
  }

  const formData = new FormData();
  const safeName = fileName.replace(/[/\\]/g, '_') || 'document.pdf';

  if (Platform.OS === 'web') {
    const blobResponse = await fetch(fileUri);
    if (!blobResponse.ok) {
      throw new Error(`Failed to read file: ${blobResponse.status}`);
    }
    const blob = await blobResponse.blob();
    formData.append('file', blob, safeName);
    try {
      const { data } = await api.post<UploadCriminalRecordResponse>('/users/me/criminal-record', formData, {
        timeout: 120_000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });
      return data;
    } catch (e: unknown) {
      throw parseAxiosUploadError(e);
    }
  }

  formData.append('file', {
    uri: fileUri,
    type: 'application/pdf',
    name: safeName,
  } as unknown as Blob);

  const headers = await authHeaders();
  const url = `${env.apiUrl.replace(/\/$/, '')}/users/me/criminal-record`;
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const bodyText = await response.text();
    let jsonMessage: string | undefined;
    try {
      const errData = JSON.parse(bodyText) as { message?: string | string[] };
      const m = errData?.message;
      if (typeof m === 'string') jsonMessage = m;
      else if (Array.isArray(m) && m[0]) jsonMessage = String(m[0]);
    } catch {
      // not JSON
    }
    const message = normalizeUploadError(response.status, bodyText, jsonMessage);
    const err = new Error(message) as Error & { status: number };
    err.status = response.status;
    throw err;
  }

  return (await response.json()) as UploadCriminalRecordResponse;
}

export async function getMyCriminalRecordDownloadUrl(): Promise<string> {
  if (!env.apiUrl?.trim()) {
    throw new Error('API URL is not configured');
  }
  if (Platform.OS === 'web') {
    try {
      const { data } = await api.get<{ url: string }>('/users/me/criminal-record/download-url');
      return data.url;
    } catch (e: unknown) {
      const o = e as { message?: string };
      throw new Error(o.message || 'Impossible de récupérer le lien du document');
    }
  }
  const headers = await authHeaders();
  const url = `${env.apiUrl.replace(/\/$/, '')}/users/me/criminal-record/download-url`;
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const bodyText = await response.text();
    let jsonMessage: string | undefined;
    try {
      const errData = JSON.parse(bodyText) as { message?: string };
      if (errData?.message) jsonMessage = errData.message;
    } catch {
      // ignore
    }
    throw new Error(normalizeUploadError(response.status, bodyText, jsonMessage));
  }
  const data = (await response.json()) as { url: string };
  return data.url;
}
