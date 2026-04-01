import { api } from "@/lib/api";
import type {
  Project,
  ProjectDocumentUpdateResponse,
  ProjectRoomInfo,
} from "@/types/api";

type CreateProjectPayload = {
  name: string;
  description: string;
  language: "python" | "javascript";
};

type UpdateProjectPayload = {
  name?: string;
  description?: string;
  language?: "python" | "javascript";
};

export const projectService = {
  async list(search?: string) {
    const response = await api.get<Project[]>("/projects", {
      params: search ? { search } : undefined,
    });
    return response.data;
  },

  async create(payload: CreateProjectPayload) {
    const response = await api.post<Project>("/projects", payload);
    return response.data;
  },

  async get(projectId: string) {
    const response = await api.get<Project>(`/projects/${projectId}`);
    return response.data;
  },

  async getRoom(projectId: string) {
    const response = await api.get<ProjectRoomInfo>(`/projects/${projectId}/room`);
    return response.data;
  },

  async saveDocument(projectId: string, plain_text: string) {
    const response = await api.put<ProjectDocumentUpdateResponse>(`/projects/${projectId}/document`, {
      plain_text,
    });
    return response.data;
  },

  async update(projectId: string, payload: UpdateProjectPayload) {
    const response = await api.patch<Project>(`/projects/${projectId}`, payload);
    return response.data;
  },

  async remove(projectId: string) {
    await api.delete(`/projects/${projectId}`);
  },
};