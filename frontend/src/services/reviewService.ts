import { api } from "@/lib/api";
import type { AIReview } from "@/types/api";

type ReviewPayload = {
  source_code: string;
  language: "python" | "javascript";
  collaboration_context: Record<string, unknown>;
};

export const reviewService = {
  async review(projectId: string, payload: ReviewPayload) {
    const response = await api.post<AIReview>(`/reviews/projects/${projectId}`, payload);
    return response.data;
  },

  async list(projectId: string, limit = 20) {
    const response = await api.get<AIReview[]>(`/reviews/projects/${projectId}`, {
      params: { limit },
    });
    return response.data;
  },
};