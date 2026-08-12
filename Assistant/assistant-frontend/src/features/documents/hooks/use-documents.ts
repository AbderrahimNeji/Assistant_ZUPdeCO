"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { DocumentsApi } from "@/features/documents/services/documents.api";
import { QUERY_KEYS } from "@/features/shared/constants/query-keys";

function useDocumentVisible() {
  const [visible, setVisible] = useState(
    typeof document === "undefined" ? true : document.visibilityState === "visible",
  );

  useEffect(() => {
    const onVisibility = () => {
      setVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return visible;
}

export function useDocuments() {
  const isVisible = useDocumentVisible();

  return useQuery({
    queryKey: QUERY_KEYS.DOCUMENTS.ROOT,
    queryFn: () => DocumentsApi.list(),
    refetchInterval: (query) => {
      if (!isVisible) return false;
      const documents = query.state.data;
      if (documents?.some((document) => document.status === "processing")) {
        return 3000;
      }
      return false;
    },
  });
}
