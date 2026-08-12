"use client";

import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  WorkflowJobsApi,
  type WorkflowJob,
} from "@/features/chat/services/workflow-jobs.api";
import { QUERY_KEYS } from "@/features/shared/constants/query-keys";
import { toast } from "@/features/shared/store/toast.store";

const ACTIVE: WorkflowJob["status"][] = [
  "QUEUED",
  "RUNNING",
  "WAITING_CONFIRMATION",
];

export function useWorkflowJobs(conversationId: string | null | undefined) {
  const queryClient = useQueryClient();
  const seenTerminal = useRef<Map<string, WorkflowJob["status"]>>(new Map());

  const query = useQuery({
    queryKey: QUERY_KEYS.WORKFLOW_JOBS.LIST(conversationId),
    queryFn: () => WorkflowJobsApi.list(conversationId ?? undefined),
    enabled: Boolean(conversationId),
    refetchInterval: (current) => {
      const jobs = current.state.data ?? [];
      return jobs.some((job) => ACTIVE.includes(job.status)) ? 2500 : false;
    },
  });

  useEffect(() => {
    const jobs = query.data ?? [];
    for (const job of jobs) {
      const previous = seenTerminal.current.get(job.id);
      const isTerminal =
        job.status === "COMPLETED" ||
        job.status === "FAILED" ||
        job.status === "CANCELLED";

      if (!isTerminal) {
        seenTerminal.current.set(job.id, job.status);
        continue;
      }

      if (previous && ACTIVE.includes(previous) && previous !== job.status) {
        if (job.status === "COMPLETED") {
          toast({
            title: "Background workflow finished",
            description: job.workflowName ?? job.workflowId,
            variant: "success",
          });
        } else if (job.status === "FAILED") {
          toast({
            title: "Background workflow failed",
            description: job.error?.slice(0, 140) ?? "Something went wrong.",
            variant: "error",
          });
        }

        void queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.CHAT.MESSAGES(job.conversationId),
        });
      }

      seenTerminal.current.set(job.id, job.status);
    }
  }, [query.data, queryClient]);

  const cancel = useMutation({
    mutationFn: (jobId: string) => WorkflowJobsApi.cancel(jobId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.WORKFLOW_JOBS.ROOT,
      });
    },
  });

  const retry = useMutation({
    mutationFn: (jobId: string) => WorkflowJobsApi.retry(jobId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.WORKFLOW_JOBS.ROOT,
      });
      toast({
        title: "Workflow retried",
        description: "Running again in the background.",
        variant: "success",
      });
    },
  });

  return {
    jobs: query.data ?? [],
    isLoading: query.isLoading,
    cancel,
    retry,
    refetch: query.refetch,
  };
}
