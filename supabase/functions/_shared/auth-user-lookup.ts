import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export async function findAuthUserIdByEmail(
  adminClient: SupabaseClient,
  email: string,
): Promise<string | null> {
  const normalized = email.trim().toLowerCase();

  try {
    const { data, error } = await adminClient.rpc("auth_user_id_by_email", {
      p_email: normalized,
    });
    if (!error && data) return data as string;
    if (error) {
      console.warn("[auth-user-lookup] rpc:", error.message);
    }
  } catch (err) {
    console.warn("[auth-user-lookup] rpc failed:", err);
  }

  let page = 1;
  while (page <= 5) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error || !data?.users?.length) break;

    const found = data.users.find(
      (user) => user.email?.trim().toLowerCase() === normalized,
    );
    if (found?.id) return found.id;

    if (data.users.length < 200) break;
    page += 1;
  }

  return null;
}
