"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const getMissingSupabaseEnvVars = () => {
  const missingEnvVars: string[] = [];

  if (!supabaseUrl) {
    missingEnvVars.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!supabaseAnonKey) {
    missingEnvVars.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return missingEnvVars;
};

const getSupabaseEnv = () => {
  const missingEnvVars = getMissingSupabaseEnvVars();

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing Supabase environment variables: ${missingEnvVars.join(", ")}`,
    );
  }

  return {
    supabaseUrl: supabaseUrl as string,
    supabaseAnonKey: supabaseAnonKey as string,
  };
};

const createSupabaseClient = (): SupabaseClient => {
  const env = getSupabaseEnv();

  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });
};

export const supabase = createSupabaseClient();

export default supabase;
