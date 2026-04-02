import { api } from "@/lib/api";
import type { ExecutionRun } from "@/types/api";

type RunPayload = {
  source_code: string;
  language: "python" | "javascript";
};

function normalizeRunPayload(payload: RunPayload): RunPayload {
  return {
    source_code: payload.source_code ?? "",
    language: payload.language,
  };
}

export const executionService = {
  async run(projectId: string, payload: RunPayload) {
    const normalized = normalizeRunPayload(payload);

    if (!normalized.source_code.trim()) {
      throw new Error("Нельзя запустить пустой код. Добавь код в редактор.");
    }

    const response = await api.post<ExecutionRun>(
      `/execution/projects/${projectId}/run`,
      normalized
    );

    return response.data;
  },

  async list(projectId: string, limit = 20) {
    const response = await api.get<ExecutionRun[]>(
      `/execution/projects/${projectId}/runs`,
      {
        params: { limit },
      }
    );
    return response.data;
  },
};