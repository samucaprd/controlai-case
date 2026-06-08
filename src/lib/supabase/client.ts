import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { isSupabaseConfigured } from "./is-configured";

let client: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.",
    );
  }

  if (!client) {
    client = createClient<Database>(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      },
    );
  }

  return client;
}

/** Proxy para compatibilidade com imports legados (`import { supabase }`). */
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    const instance = getSupabase();
    const value = instance[prop as keyof SupabaseClient<Database>];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
