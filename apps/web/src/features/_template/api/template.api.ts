import { apiClient } from "@/shared/api/client";

export function getTemplateResource<TResponse>(endpoint: string) {
  return apiClient<TResponse>(endpoint);
}
