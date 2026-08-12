"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { DocumentsApi } from "@/features/documents/services/documents.api";
import { QUERY_KEYS } from "@/features/shared/constants/query-keys";

export function useRetryDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) => DocumentsApi.retry(documentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.DOCUMENTS.ROOT,
      });
    },
  });
}
