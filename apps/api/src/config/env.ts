import { config } from "dotenv";
import { z } from "zod";

config({ path: ".env", quiet: true });

const envSchema = z.object({
  PORT: z.coerce
    .number({
      error: "PORT must be a number",
    })
    .int("PORT must be an integer")
    .min(1, "PORT must be greater than 0")
    .max(65535, "PORT must be less than or equal to 65535"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1, "DIRECT_URL is required"),
  CLIENT_URL: z
    .string()
    .min(1, "CLIENT_URL is required")
    .refine(
      (value) =>
        value
          .split(",")
          .map((url) => url.trim())
          .filter(Boolean)
          .every((url) => z.url().safeParse(url).success),
      "CLIENT_URL must contain valid URL values separated by commas",
    ),
  SUPABASE_URL: z.url("SUPABASE_URL must be a valid URL").optional(),
  SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(1, "SUPABASE_PUBLISHABLE_KEY is required")
    .optional(),
  NEXT_PUBLIC_SUPABASE_URL: z
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL")
    .optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required")
    .optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required")
    .optional(),
});

const parseClientUrls = (clientUrl: string): string[] => {
  return clientUrl
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
};

const formatEnvErrors = (error: z.ZodError): string => {
  return error.issues
    .map((issue) => {
      const field = issue.path.join(".") || "ENV";

      return `- ${field}: ${issue.message}`;
    })
    .join("\n");
};

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    [
      "Environment validation failed.",
      "Fix the following variables in apps/api/.env:",
      formatEnvErrors(parsedEnv.error),
    ].join("\n"),
  );

  process.exit(1);
}

const supabaseUrl =
  parsedEnv.data.SUPABASE_URL ?? parsedEnv.data.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  parsedEnv.data.SUPABASE_PUBLISHABLE_KEY ??
  parsedEnv.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  parsedEnv.data.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  console.error(
    [
      "Environment validation failed.",
      "Fix the following variables in apps/api/.env:",
      "- SUPABASE_URL: required for server-side auth verification",
      "- SUPABASE_PUBLISHABLE_KEY: required for server-side auth verification",
    ].join("\n"),
  );

  process.exit(1);
}

export const env = {
  ...parsedEnv.data,
  CLIENT_URLS: parseClientUrls(parsedEnv.data.CLIENT_URL),
  SUPABASE_URL: supabaseUrl,
  SUPABASE_PUBLISHABLE_KEY: supabasePublishableKey,
};

export type Env = typeof env;
