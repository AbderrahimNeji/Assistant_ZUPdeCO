"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { DocumentsApi } from "@/features/documents/services/documents.api";
import { QUERY_KEYS } from "@/features/shared/constants/query-keys";

type UploadVariables = {
  file: File;
  onProgress?: (progress: number) => void;
};

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, onProgress }: UploadVariables) =>
      DocumentsApi.upload(file, onProgress),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.DOCUMENTS.ROOT,
      });
    },
  });
}
