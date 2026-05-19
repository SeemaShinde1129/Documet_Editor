import { apiClient } from "@/shared/api/client";

export const http = {
  get: <TResponse>(endpoint: string) =>
    apiClient<TResponse>(endpoint, {
      method: "GET",
    }),
  post: <TResponse, TBody = unknown>(endpoint: string, body: TBody) =>
    apiClient<TResponse>(endpoint, {
      method: "POST",
      body,
    }),
  patch: <TResponse, TBody = unknown>(endpoint: string, body: TBody) =>
    apiClient<TResponse>(endpoint, {
      method: "PATCH",
      body,
    }),
  delete: <TResponse>(endpoint: string) =>
    apiClient<TResponse>(endpoint, {
      method: "DELETE",
    }),
};
