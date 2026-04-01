import { api } from "@/lib/api";
import type { ExecutionRun } from "@/types/api";

type RunPayload = {
  source_code: string;
  language: "python" | "javascript";
};

export const executionService = {
  async run(projectId: string, payload: RunPayload) {
    const response = await api.post<ExecutionRun>(`/execution/projects/${projectId}/run`, payload);
    return response.data;
  },

  async list(projectId: string, limit = 20) {
    const response = await api.get<ExecutionRun[]>(`/execution/projects/${projectId}/runs`, {
      params: { limit },
    });
    return response.data;
  },
};