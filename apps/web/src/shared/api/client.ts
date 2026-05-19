import { supabase } from "@/lib/supabase";
import { API_BASE_URL } from "@/shared/constants";

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

type ErrorResponseBody = {
  message?: unknown;
  errors?: unknown;
};

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

const getErrorResponseBody = async (
  response: Response,
): Promise<ErrorResponseBody | null> => {
  try {
    const body = (await response.json()) as unknown;

    if (!body || typeof body !== "object") {
      return null;
    }

    return body as ErrorResponseBody;
  } catch {
    return null;
  }
};

export async function apiClient<TResponse>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const { body, headers, ...init } = options;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const requestHeaders = new Headers(headers);

  requestHeaders.set("Content-Type", "application/json");

  if (session?.access_token) {
    requestHeaders.set("Authorization", `Bearer ${session.access_token}`);
  }

  const baseUrl = API_BASE_URL.replace(/\/$/, "");
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const requestUrl = `${baseUrl}${normalizedEndpoint}`;

  let response: Response;

  try {
    response = await fetch(requestUrl, {
      ...init,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? `Network request failed to ${requestUrl}: ${error.message}`
        : `Network request failed to ${requestUrl}`;

    throw new ApiClientError(message, 0);
  }

  if (!response.ok) {
    const errorBody = await getErrorResponseBody(response);
    const message =
      typeof errorBody?.message === "string"
        ? errorBody.message
        : `API request failed with status ${response.status}`;

    throw new ApiClientError(message, response.status, errorBody?.errors);
  }

  return response.json() as Promise<TResponse>;
}
