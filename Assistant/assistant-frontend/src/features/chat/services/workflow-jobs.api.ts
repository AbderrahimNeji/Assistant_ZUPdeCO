import { apiClient } from "@/features/shared/api/axios";
import { API_ROUTES } from "@/features/shared/api/api-routes";

export type WorkflowJobStatus =
  | "QUEUED"
  | "RUNNING"
  | "WAITING_CONFIRMATION"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type WorkflowJobProgressStep = {
  id: string;
  name: string;
  status:
    | "pending"
    | "running"
    | "completed"
    | "failed"
    | "skipped"
    | "awaiting_confirmation";
  detail?: string;
};

export type WorkflowJob = {
  id: string;
  workflowId: string;
  workflowName: string | null;
  message: string;
  status: WorkflowJobStatus;
  progress: WorkflowJobProgressStep[] | null;
  currentStep: string | null;
  error: string | null;
  resultAnswer: string | null;
  confirmationId: string | null;
  resultMessageId: string | null;
  executionTraceId: string | null;
  executionMode: string;
  queueTimeMs: number | null;
  resumeCount: number;
  startedAt: string | null;
  finishedAt: string | null;
  queuedAt: string;
  conversationId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export const WorkflowJobsApi = {
  async list(conversationId?: string): Promise<WorkflowJob[]> {
    const response = await apiClient.get<{
      success: boolean;
      jobs: WorkflowJob[];
    }>(API_ROUTES.WORKFLOW_JOBS.LIST, {
      params: conversationId ? { conversationId } : undefined,
    });
    return response.data.jobs ?? [];
  },

  async cancel(jobId: string): Promise<WorkflowJob> {
    const response = await apiClient.post<{
      success: boolean;
      job: WorkflowJob;
    }>(API_ROUTES.WORKFLOW_JOBS.CANCEL(jobId));
    return response.data.job;
  },

  async retry(jobId: string): Promise<WorkflowJob> {
    const response = await apiClient.post<{
      success: boolean;
      job: WorkflowJob;
    }>(API_ROUTES.WORKFLOW_JOBS.RETRY(jobId));
    return response.data.job;
  },
};
