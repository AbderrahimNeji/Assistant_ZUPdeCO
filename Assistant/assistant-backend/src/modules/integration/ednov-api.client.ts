import {
  BadGatewayException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  Method,
} from 'axios';
import axiosRetry from 'axios-retry';

import { RequestContextStore } from './request-context';

export type EdnovRequestOptions = {
  /** Override bearer token (defaults to request-scoped Firebase token). */
  accessToken?: string;
  params?: Record<string, unknown>;
  timeoutMs?: number;
  headers?: Record<string, string>;
};

@Injectable()
export class EdnovApiClient {
  private readonly logger = new Logger(EdnovApiClient.name);
  private readonly http: AxiosInstance;
  private readonly baseURL: string;

  constructor() {
    this.baseURL = (
      process.env.EDNOV_API_BASE_URL ?? 'http://localhost:3000/api/v1'
    ).replace(/\/$/, '');

    this.http = axios.create({
      baseURL: this.baseURL,
      timeout: Number(process.env.EDNOV_API_TIMEOUT_MS ?? 15_000),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    axiosRetry(this.http, {
      retries: Number(process.env.EDNOV_API_RETRIES ?? 2),
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        if (axiosRetry.isNetworkOrIdempotentRequestError(error)) return true;
        const status = error.response?.status;
        return status === 429 || status === 502 || status === 503 || status === 504;
      },
    });
  }

  async get<T>(path: string, options?: EdnovRequestOptions): Promise<T> {
    return this.request<T>('GET', path, undefined, options);
  }

  async post<T>(
    path: string,
    body?: unknown,
    options?: EdnovRequestOptions,
  ): Promise<T> {
    return this.request<T>('POST', path, body, options);
  }

  async patch<T>(
    path: string,
    body?: unknown,
    options?: EdnovRequestOptions,
  ): Promise<T> {
    return this.request<T>('PATCH', path, body, options);
  }

  async put<T>(
    path: string,
    body?: unknown,
    options?: EdnovRequestOptions,
  ): Promise<T> {
    return this.request<T>('PUT', path, body, options);
  }

  async delete<T>(path: string, options?: EdnovRequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, undefined, options);
  }

  private async request<T>(
    method: Method,
    path: string,
    data?: unknown,
    options?: EdnovRequestOptions,
  ): Promise<T> {
    const token =
      options?.accessToken ?? RequestContextStore.getAccessToken();

    if (!token) {
      throw new UnauthorizedException(
        'Missing access token for Ednov API call',
      );
    }

    const resolvedPath = await this.resolveCompanyScopedPath(
      path.startsWith('/') ? path : `/${path}`,
      token,
    );

    const config: AxiosRequestConfig = {
      method,
      url: resolvedPath,
      data,
      params: options?.params,
      timeout: options?.timeoutMs,
      headers: {
        ...(options?.headers ?? {}),
        Authorization: `Bearer ${token}`,
      },
    };

    try {
      const response = await this.http.request<T>(config);
      return response.data;
    } catch (error) {
      throw this.mapError(error, method, path);
    }
  }

  /**
   * Mirror ednov-web `api-client`: `/companies/current` is not a backend route.
   * Nest expects `/companies/:uuid`.
   */
  private async resolveCompanyScopedPath(
    path: string,
    token: string,
  ): Promise<string> {
    if (!path.includes('companies/current')) return path;

    let companyId = RequestContextStore.getEdnovCompanyId();
    if (!companyId) {
      companyId = await this.fetchCompanyId(token);
      if (companyId) {
        RequestContextStore.patch({ ednovCompanyId: companyId });
      }
    }
    if (!companyId) {
      throw new BadGatewayException(
        'Ednov company context unavailable — cannot resolve /companies/current',
      );
    }
    const encodedCompanyId = encodeURIComponent(companyId);
    return path.replaceAll('companies/current', `companies/${encodedCompanyId}`);
  }

  private async fetchCompanyId(token: string): Promise<string | undefined> {
    try {
      const response = await this.http.request<{ companyId?: string }>({
        method: 'GET',
        url: '/users/login',
        headers: { Authorization: `Bearer ${token}` },
      });
      const id = response.data?.companyId?.trim();
      return id || undefined;
    } catch {
      return undefined;
    }
  }

  private mapError(error: unknown, method: Method, path: string): Error {
    if (!axios.isAxiosError(error)) {
      this.logger.warn(`Ednov API unexpected error ${method} ${path}`);
      return new BadGatewayException('Ednov API request failed');
    }

    const axiosError = error as AxiosError<{
      message?: string | string[];
      error?: string;
    }>;
    const status = axiosError.response?.status;
    const payload = axiosError.response?.data;
    const message = Array.isArray(payload?.message)
      ? payload.message.join(', ')
      : payload?.message ||
        payload?.error ||
        axiosError.message ||
        'Ednov API request failed';

    this.logger.debug(
      `Ednov API ${method} ${path} → ${status ?? 'network'} ${message}`,
    );

    if (status === 401) {
      return new UnauthorizedException('Ednov session expired. Please sign in again.');
    }
    if (status === 403) {
      return new ForbiddenException('You cannot access that resource.');
    }
    if (status === 404) {
      return new NotFoundException('Resource not found.');
    }
    if (status === 502 || status === 503 || status === 504) {
      return new ServiceUnavailableException(
        'The application is temporarily unavailable. Please try again in a moment.',
      );
    }

    return new BadGatewayException(
      'The application request could not be completed. Please try again.',
    );
  }
}
