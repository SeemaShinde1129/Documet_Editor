import { Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";

type ErrorResponse = {
  success: false;
  message: string;
  errors?: unknown;
};

const formatZodIssues = (error: ZodError) => {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
};

const getPrismaErrorMessage = (
  error: Prisma.PrismaClientKnownRequestError,
): { statusCode: number; message: string } => {
  switch (error.code) {
    case "P2002":
      return {
        statusCode: 409,
        message: "A record with this value already exists",
      };
    case "P2025":
      return {
        statusCode: 404,
        message: "Requested record was not found",
      };
    default:
      return {
        statusCode: 500,
        message: "Database request failed",
      };
  }
};

export const registerErrorHandler = async (
  fastify: FastifyInstance,
): Promise<void> => {
  fastify.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, "Unhandled request error");
    console.error(error);

    if (error instanceof ZodError) {
      const response: ErrorResponse = {
        success: false,
        message: "Validation failed",
        errors: formatZodIssues(error),
      };

      return reply.code(400).send(response);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const { statusCode, message } = getPrismaErrorMessage(error);
      const response: ErrorResponse = {
        success: false,
        message,
      };

      return reply.code(statusCode).send(response);
    }

    const response: ErrorResponse = {
      success: false,
      message: "Internal server error",
    };

    return reply.code(500).send(response);
  });
};
