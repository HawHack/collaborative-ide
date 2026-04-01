import { api, setAccessToken } from "@/lib/api";
import type { AuthSessionResponse, RefreshResponse, User } from "@/types/api";

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = {
  email: string;
  password: string;
  full_name: string;
};

async function fetchUser(): Promise<User> {
  const response = await api.get<User>("/users/me");
  return response.data;
}

export const authService = {
  async login(payload: LoginPayload): Promise<AuthSessionResponse> {
    const response = await api.post<AuthSessionResponse>("/auth/login", payload);
    setAccessToken(response.data.access_token);
    return response.data;
  },

  async register(payload: RegisterPayload): Promise<AuthSessionResponse> {
    const response = await api.post<AuthSessionResponse>("/auth/register", payload);
    setAccessToken(response.data.access_token);
    return response.data;
  },

  async refresh(): Promise<RefreshResponse> {
    const response = await api.post<RefreshResponse>("/auth/refresh");
    setAccessToken(response.data.access_token);
    return response.data;
  },

  async bootstrap(): Promise<AuthSessionResponse> {
    const refreshed = await this.refresh();
    const user = await fetchUser();
    return {
      access_token: refreshed.access_token,
      token_type: refreshed.token_type,
      expires_at: refreshed.expires_at,
      user,
    };
  },

  async logout() {
    await api.post("/auth/logout");
    setAccessToken(null);
  },
};