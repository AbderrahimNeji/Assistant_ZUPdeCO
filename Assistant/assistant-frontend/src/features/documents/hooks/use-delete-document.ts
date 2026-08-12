"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { DocumentsApi } from "@/features/documents/services/documents.api";
import { QUERY_KEYS } from "@/features/shared/constants/query-keys";

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentIds: string | string[]) => {
      const ids = Array.isArray(documentIds) ? documentIds : [documentIds];
      for (const id of ids) {
        await DocumentsApi.remove(id);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.DOCUMENTS.ROOT,
      });
    },
  });
}
