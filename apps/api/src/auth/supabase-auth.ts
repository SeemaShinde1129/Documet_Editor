import type { FastifyRequest } from "fastify";
import { z } from "zod";
import { env } from "../config/env";

export type AuthenticatedUser = {
  id: string;
  email: string | null;
};

export class AuthenticationError extends Error {
  statusCode = 401;

  constructor(message = "Authentication is required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  statusCode = 403;

  constructor(message = "You do not have permission to perform this action") {
    super(message);
    this.name = "AuthorizationError";
  }
}

const supabaseUserSchema = z.object({
  id: z.uuid(),
  email: z.string().email().nullable().optional(),
});

const supabaseJwtPayloadSchema = z.object({
  sub: z.uuid(),
  email: z.string().email().nullable().optional(),
  exp: z.number().optional(),
});

let hasWarnedAboutLocalJwtFallback = false;

const getBearerToken = (request: FastifyRequest): string => {
  const authorization = request.headers.authorization;

  if (!authorization) {
    throw new AuthenticationError();
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new AuthenticationError("Invalid authorization header");
  }

  return token;
};

const decodeBase64UrlJson = (value: string): unknown => {
  const normalizedValue = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddedValue = normalizedValue.padEnd(
    normalizedValue.length + ((4 - (normalizedValue.length % 4)) % 4),
    "=",
  );

  return JSON.parse(Buffer.from(paddedValue, "base64").toString("utf8"));
};

const getAuthenticatedUserFromUnverifiedJwt = (
  token: string,
): AuthenticatedUser => {
  if (process.env.NODE_ENV === "production") {
    throw new AuthenticationError("Unable to verify authentication session");
  }

  const [, payload] = token.split(".");

  if (!payload) {
    throw new AuthenticationError("Invalid authentication session");
  }

  const parsedPayload = supabaseJwtPayloadSchema.safeParse(
    decodeBase64UrlJson(payload),
  );

  if (!parsedPayload.success) {
    throw new AuthenticationError("Invalid authentication session");
  }

  if (
    typeof parsedPayload.data.exp === "number" &&
    parsedPayload.data.exp * 1000 < Date.now()
  ) {
    throw new AuthenticationError("Authentication session has expired");
  }

  if (!hasWarnedAboutLocalJwtFallback) {
    console.warn(
      "Supabase auth verification endpoint is unreachable. Using local development JWT payload fallback. Do not use this mode in production.",
    );
    hasWarnedAboutLocalJwtFallback = true;
  }

  return {
    id: parsedPayload.data.sub,
    email: parsedPayload.data.email ?? null,
  };
};

export const getAuthenticatedUserFromToken = async (
  token: string,
): Promise<AuthenticatedUser> => {
  try {
    const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: env.SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new AuthenticationError(
        "Invalid or expired authentication session",
      );
    }

    const parsedUser = supabaseUserSchema.safeParse(await response.json());

    if (!parsedUser.success) {
      throw new AuthenticationError("Invalid authentication session");
    }

    return {
      id: parsedUser.data.id,
      email: parsedUser.data.email ?? null,
    };
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }

    return getAuthenticatedUserFromUnverifiedJwt(token);
  }
};

export const getAuthenticatedUser = async (
  request: FastifyRequest,
): Promise<AuthenticatedUser> => {
  return getAuthenticatedUserFromToken(getBearerToken(request));
};
