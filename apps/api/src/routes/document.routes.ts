import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { ZodError } from "zod";
import {
  AuthenticationError,
  AuthorizationError,
  getAuthenticatedUser,
} from "../auth/supabase-auth";
import {
  addDocumentCollaboratorByEmail,
  createDocument,
  deleteDocument,
  getAccessibleDocumentById,
  getAccessibleDocuments,
  getDocumentCollaborators,
  getDocumentOwnerId,
  ensureUserRecord,
  removeDocumentCollaborator,
  updateDocumentTitle,
} from "../services/document.service";
import {
  collaboratorParamsSchema,
  createDocumentSchema,
  documentParamsSchema,
  initializeDocumentSchema,
  shareDocumentSchema,
  updateDocumentTitleSchema,
  type CollaboratorParams,
  type CreateDocumentInput,
  type DocumentParams,
  type InitializeDocumentInput,
  type ShareDocumentInput,
  type UpdateDocumentTitleInput,
} from "../validators/document.validator";

const formatValidationErrors = (error: ZodError) => {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
};

const sendAuthorizationError = (
  error: AuthenticationError | AuthorizationError,
  reply: FastifyReply,
) => {
  return reply.code(error.statusCode).send({
    success: false,
    message: error.message,
  });
};

const ensureDocumentOwner = async (
  documentId: string,
  userId: string,
): Promise<"authorized" | "not-found"> => {
  const ownerId = await getDocumentOwnerId(documentId);

  if (!ownerId) {
    return "not-found";
  }

  if (ownerId !== userId) {
    throw new AuthorizationError(
      "Only the document owner can perform this action",
    );
  }

  return "authorized";
};

export const documentRoutes = async (
  fastify: FastifyInstance,
): Promise<void> => {
  fastify.post(
    "/documents",
    async (
      request: FastifyRequest<{ Body: CreateDocumentInput }>,
      reply: FastifyReply,
    ) => {
      try {
        const authenticatedUser = await getAuthenticatedUser(request);
        await ensureUserRecord(authenticatedUser);
        const validationResult = createDocumentSchema.safeParse({
          body: request.body,
        });

        if (!validationResult.success) {
          return reply.code(400).send({
            success: false,
            message: "Invalid document payload",
            errors: formatValidationErrors(validationResult.error),
          });
        }

        if (validationResult.data.body.ownerId !== authenticatedUser.id) {
          throw new AuthorizationError(
            "Document owner must match the authenticated user",
          );
        }

        const document = await createDocument({
          ...validationResult.data.body,
          ownerUsername: authenticatedUser.email ?? authenticatedUser.id,
        });

        return reply.code(201).send({
          success: true,
          data: document,
        });
      } catch (error) {
        if (
          error instanceof AuthenticationError ||
          error instanceof AuthorizationError
        ) {
          return sendAuthorizationError(error, reply);
        }

        request.log.error({ err: error }, "Failed to create document");

        return reply.code(500).send({
          success: false,
          message: "Failed to create document",
        });
      }
    },
  );

  fastify.post(
    "/documents/initialize",
    async (
      request: FastifyRequest<{ Body: InitializeDocumentInput }>,
      reply: FastifyReply,
    ) => {
      try {
        const authenticatedUser = await getAuthenticatedUser(request);
        await ensureUserRecord(authenticatedUser);
        const validationResult = initializeDocumentSchema.safeParse({
          body: request.body,
        });

        if (!validationResult.success) {
          return reply.code(400).send({
            success: false,
            message: "Invalid document initialization payload",
            errors: formatValidationErrors(validationResult.error),
          });
        }

        const document = await createDocument({
          title: validationResult.data.body.title,
          ownerId: authenticatedUser.id,
          ownerUsername: authenticatedUser.email ?? authenticatedUser.id,
        });

        return reply.code(201).send({
          success: true,
          data: document,
        });
      } catch (error) {
        if (
          error instanceof AuthenticationError ||
          error instanceof AuthorizationError
        ) {
          return sendAuthorizationError(error, reply);
        }

        request.log.error({ err: error }, "Failed to initialize document");

        return reply.code(500).send({
          success: false,
          message: "Failed to initialize document",
        });
      }
    },
  );

  fastify.get(
    "/documents/:id",
    async (
      request: FastifyRequest<{ Params: DocumentParams }>,
      reply: FastifyReply,
    ) => {
      try {
        const authenticatedUser = await getAuthenticatedUser(request);
        await ensureUserRecord(authenticatedUser);
        const validationResult = documentParamsSchema.safeParse({
          params: request.params,
        });

        if (!validationResult.success) {
          return reply.code(400).send({
            success: false,
            message: "Invalid document params",
            errors: formatValidationErrors(validationResult.error),
          });
        }

        const document = await getAccessibleDocumentById(
          validationResult.data.params.id,
          authenticatedUser.id,
        );

        if (!document) {
          const ownerId = await getDocumentOwnerId(
            validationResult.data.params.id,
          );

          return reply.code(ownerId ? 403 : 404).send({
            success: false,
            message: ownerId
              ? "You do not have access to this document"
              : "Document not found",
          });
        }

        return reply.code(200).send({
          success: true,
          data: document,
        });
      } catch (error) {
        if (
          error instanceof AuthenticationError ||
          error instanceof AuthorizationError
        ) {
          return sendAuthorizationError(error, reply);
        }

        request.log.error({ err: error }, "Failed to fetch document");

        return reply.code(500).send({
          success: false,
          message: "Failed to fetch document",
        });
      }
    },
  );

  fastify.patch(
    "/documents/:id/title",
    async (
      request: FastifyRequest<{
        Params: DocumentParams;
        Body: UpdateDocumentTitleInput;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const authenticatedUser = await getAuthenticatedUser(request);
        await ensureUserRecord(authenticatedUser);
        const validationResult = updateDocumentTitleSchema.safeParse({
          params: request.params,
          body: request.body,
        });

        if (!validationResult.success) {
          return reply.code(400).send({
            success: false,
            message: "Invalid document title payload",
            errors: formatValidationErrors(validationResult.error),
          });
        }

        const authorizationStatus = await ensureDocumentOwner(
          validationResult.data.params.id,
          authenticatedUser.id,
        );

        if (authorizationStatus === "not-found") {
          return reply.code(404).send({
            success: false,
            message: "Document not found",
          });
        }

        const document = await updateDocumentTitle(
          validationResult.data.params.id,
          validationResult.data.body.title,
        );

        return reply.code(200).send({
          success: true,
          data: document,
        });
      } catch (error) {
        if (
          error instanceof AuthenticationError ||
          error instanceof AuthorizationError
        ) {
          return sendAuthorizationError(error, reply);
        }

        request.log.error({ err: error }, "Failed to update document title");

        return reply.code(500).send({
          success: false,
          message: "Failed to update document title",
        });
      }
    },
  );

  fastify.delete(
    "/documents/:id",
    async (
      request: FastifyRequest<{ Params: DocumentParams }>,
      reply: FastifyReply,
    ) => {
      try {
        const authenticatedUser = await getAuthenticatedUser(request);
        await ensureUserRecord(authenticatedUser);
        const validationResult = documentParamsSchema.safeParse({
          params: request.params,
        });

        if (!validationResult.success) {
          return reply.code(400).send({
            success: false,
            message: "Invalid document params",
            errors: formatValidationErrors(validationResult.error),
          });
        }

        const authorizationStatus = await ensureDocumentOwner(
          validationResult.data.params.id,
          authenticatedUser.id,
        );

        if (authorizationStatus === "not-found") {
          return reply.code(404).send({
            success: false,
            message: "Document not found",
          });
        }

        await deleteDocument(validationResult.data.params.id);

        return reply.code(200).send({
          success: true,
          data: {
            id: validationResult.data.params.id,
          },
        });
      } catch (error) {
        if (
          error instanceof AuthenticationError ||
          error instanceof AuthorizationError
        ) {
          return sendAuthorizationError(error, reply);
        }

        request.log.error({ err: error }, "Failed to delete document");

        return reply.code(500).send({
          success: false,
          message: "Failed to delete document",
        });
      }
    },
  );

  fastify.get(
    "/documents/:id/collaborators",
    async (
      request: FastifyRequest<{ Params: DocumentParams }>,
      reply: FastifyReply,
    ) => {
      try {
        const authenticatedUser = await getAuthenticatedUser(request);
        await ensureUserRecord(authenticatedUser);
        const validationResult = documentParamsSchema.safeParse({
          params: request.params,
        });

        if (!validationResult.success) {
          return reply.code(400).send({
            success: false,
            message: "Invalid document params",
            errors: formatValidationErrors(validationResult.error),
          });
        }

        const document = await getAccessibleDocumentById(
          validationResult.data.params.id,
          authenticatedUser.id,
        );

        if (!document) {
          const ownerId = await getDocumentOwnerId(
            validationResult.data.params.id,
          );

          return reply.code(ownerId ? 403 : 404).send({
            success: false,
            message: ownerId
              ? "You do not have access to this document"
              : "Document not found",
          });
        }

        const collaborators = await getDocumentCollaborators(
          validationResult.data.params.id,
        );

        return reply.code(200).send({
          success: true,
          data: collaborators,
        });
      } catch (error) {
        if (
          error instanceof AuthenticationError ||
          error instanceof AuthorizationError
        ) {
          return sendAuthorizationError(error, reply);
        }

        request.log.error({ err: error }, "Failed to fetch collaborators");

        return reply.code(500).send({
          success: false,
          message: "Failed to fetch collaborators",
        });
      }
    },
  );

  fastify.post(
    "/documents/:id/collaborators",
    async (
      request: FastifyRequest<{
        Params: DocumentParams;
        Body: ShareDocumentInput;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const authenticatedUser = await getAuthenticatedUser(request);
        await ensureUserRecord(authenticatedUser);
        const validationResult = shareDocumentSchema.safeParse({
          params: request.params,
          body: request.body,
        });

        if (!validationResult.success) {
          return reply.code(400).send({
            success: false,
            message: "Invalid collaborator payload",
            errors: formatValidationErrors(validationResult.error),
          });
        }

        const authorizationStatus = await ensureDocumentOwner(
          validationResult.data.params.id,
          authenticatedUser.id,
        );

        if (authorizationStatus === "not-found") {
          return reply.code(404).send({
            success: false,
            message: "Document not found",
          });
        }

        const collaborator = await addDocumentCollaboratorByEmail({
          documentId: validationResult.data.params.id,
          email: validationResult.data.body.email,
          role: validationResult.data.body.role,
        });

        if (!collaborator) {
          return reply.code(404).send({
            success: false,
            message:
              "Collaborator user was not found. They need to sign in once before sharing.",
          });
        }

        return reply.code(201).send({
          success: true,
          data: collaborator,
        });
      } catch (error) {
        if (
          error instanceof AuthenticationError ||
          error instanceof AuthorizationError
        ) {
          return sendAuthorizationError(error, reply);
        }

        request.log.error({ err: error }, "Failed to share document");

        return reply.code(500).send({
          success: false,
          message: "Failed to share document",
        });
      }
    },
  );

  fastify.delete(
    "/documents/:id/collaborators/:userId",
    async (
      request: FastifyRequest<{ Params: CollaboratorParams }>,
      reply: FastifyReply,
    ) => {
      try {
        const authenticatedUser = await getAuthenticatedUser(request);
        await ensureUserRecord(authenticatedUser);
        const validationResult = collaboratorParamsSchema.safeParse({
          params: request.params,
        });

        if (!validationResult.success) {
          return reply.code(400).send({
            success: false,
            message: "Invalid collaborator params",
            errors: formatValidationErrors(validationResult.error),
          });
        }

        const authorizationStatus = await ensureDocumentOwner(
          validationResult.data.params.id,
          authenticatedUser.id,
        );

        if (authorizationStatus === "not-found") {
          return reply.code(404).send({
            success: false,
            message: "Document not found",
          });
        }

        await removeDocumentCollaborator(
          validationResult.data.params.id,
          validationResult.data.params.userId,
        );

        return reply.code(200).send({
          success: true,
          data: {
            id: validationResult.data.params.userId,
          },
        });
      } catch (error) {
        if (
          error instanceof AuthenticationError ||
          error instanceof AuthorizationError
        ) {
          return sendAuthorizationError(error, reply);
        }

        request.log.error({ err: error }, "Failed to remove collaborator");

        return reply.code(500).send({
          success: false,
          message: "Failed to remove collaborator",
        });
      }
    },
  );

  fastify.get("/documents", async (request, reply) => {
    try {
      const authenticatedUser = await getAuthenticatedUser(request);
      await ensureUserRecord(authenticatedUser);
      const documents = await getAccessibleDocuments(authenticatedUser.id);

      return reply.code(200).send({
        success: true,
        data: documents,
      });
    } catch (error) {
      if (
        error instanceof AuthenticationError ||
        error instanceof AuthorizationError
      ) {
        return sendAuthorizationError(error, reply);
      }

      request.log.error({ err: error }, "Failed to fetch documents");

      return reply.code(500).send({
        success: false,
        message: "Failed to fetch documents",
      });
    }
  });
};
