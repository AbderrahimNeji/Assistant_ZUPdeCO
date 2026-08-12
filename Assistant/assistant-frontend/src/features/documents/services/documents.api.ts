import { apiClient } from "@/features/shared/api/axios";
import { API_ROUTES } from "@/features/shared/api/api-routes";
import type {
  DocumentItem,
  DocumentUploadResponse,
} from "@/features/documents/types";
import { mapDocuments } from "@/features/documents/utils/map-document";

export const DocumentsApi = {
  async list(): Promise<DocumentItem[]> {
    const response = await apiClient.get(API_ROUTES.DOCUMENTS.LIST);
    const payload = response.data;
    const rows = Array.isArray(payload) ? payload : payload?.data ?? [];
    return mapDocuments(rows);
  },

  async upload(
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post<DocumentUploadResponse>(
      API_ROUTES.DOCUMENTS.UPLOAD,
      formData,
      {
        onUploadProgress: (event) => {
          if (!onProgress || !event.total) return;
          const percent = Math.round((event.loaded / event.total) * 100);
          // Reserve the last stretch for server-side indexing feedback.
          onProgress(Math.min(90, Math.max(0, percent)));
        },
      },
    );

    return response.data;
  },

  async retry(documentId: string): Promise<void> {
    await apiClient.post(API_ROUTES.DOCUMENTS.RETRY(documentId));
  },

  async remove(documentId: string): Promise<void> {
    await apiClient.delete(API_ROUTES.DOCUMENTS.DELETE(documentId));
  },
};
