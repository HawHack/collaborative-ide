import { api } from "@/lib/api";
import type {
  ApiMessageResponse,
  Project,
  ProjectDocumentUpdateResponse,
  ProjectListItem,
  ProjectRoomInfo,
} from "@/types/api";

type CreateProjectPayload = {
  name: string;
  description: string;
  language: "python" | "javascript";
};

type AddMemberPayload = {
  email: string;
  role: "editor" | "viewer";
};

type UpdateMemberRolePayload = {
  role: "editor" | "viewer";
};

export const projectService = {
  async list(search?: string) {
    const response = await api.get<ProjectListItem[]>("/projects", {
      params: search ? { search } : undefined,
    });
    return response.data;
  },

  async create(payload: CreateProjectPayload) {
    const response = await api.post<Project>("/projects", payload);
    return response.data;
  },

  async getRoom(projectId: string) {
    const response = await api.get<ProjectRoomInfo>(`/projects/${projectId}/room`);
    return response.data;
  },

  async saveDocument(projectId: string, plainText: string) {
    const response = await api.put<ProjectDocumentUpdateResponse>(
      `/projects/${projectId}/document`,
      {
        plain_text: plainText,
      }
    );
    return response.data;
  },

  async addMember(projectId: string, payload: AddMemberPayload) {
    const response = await api.post<Project>(`/projects/${projectId}/members`, payload);
    return response.data;
  },

  async updateMemberRole(projectId: string, userId: string, payload: UpdateMemberRolePayload) {
    const response = await api.patch<Project>(`/projects/${projectId}/members/${userId}`, payload);
    return response.data;
  },

  async removeMember(projectId: string, userId: string) {
    const response = await api.delete<ApiMessageResponse>(`/projects/${projectId}/members/${userId}`);
    return response.data;
  },
};
