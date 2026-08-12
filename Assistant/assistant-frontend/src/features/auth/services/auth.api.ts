import { apiClient } from "@/features/shared/api/axios";
import { API_ROUTES } from "@/features/shared/api/api-routes";

import type {
  LoginRequest,
  LoginResponse,
  AuthUser,
} from "../types";

type LoginApiResponse = {
  accessToken?: string;
  access_token?: string;
  refreshToken?: string;
  refresh_token?: string;
  user?: AuthUser;
};

export const AuthApi = {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginApiResponse>(
      API_ROUTES.AUTH.LOGIN,
      data,
    );

    const raw = response.data;
    const accessToken = raw.accessToken ?? raw.access_token;

    if (!accessToken) {
      throw new Error("Login succeeded but no access token was returned.");
    }

    return {
      accessToken,
      refreshToken: raw.refreshToken ?? raw.refresh_token,
      user: raw.user
        ? {
            id: raw.user.id,
            firstName: raw.user.firstName,
            lastName: raw.user.lastName,
            email: raw.user.email,
          }
        : undefined,
    };
  },

  async logout() {
    const response = await apiClient.post(API_ROUTES.AUTH.LOGOUT);
    return response.data;
  },

  async me(): Promise<AuthUser> {
    const response = await apiClient.get<AuthUser>(API_ROUTES.AUTH.ME);
    return {
      id: response.data.id,
      firstName: response.data.firstName,
      lastName: response.data.lastName,
      email: response.data.email,
    };
  },
};
