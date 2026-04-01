import { api } from "@/lib/api";
import type { ActivityEvent, LeaderboardEntry } from "@/types/api";

export const activityService = {
  async list(projectId: string, limit = 50) {
    const response = await api.get<ActivityEvent[]>(`/activities/projects/${projectId}`, {
      params: { limit },
    });
    return response.data;
  },

  async leaderboard(projectId: string, limit = 20) {
    const response = await api.get<LeaderboardEntry[]>(
      `/activities/projects/${projectId}/leaderboard`,
      {
        params: { limit },
      }
    );
    return response.data;
  },
};