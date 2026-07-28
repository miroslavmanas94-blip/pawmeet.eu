"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function createClient() {
  // cookies() je sync, žádný await
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // ReadonlyRequestCookies má getAll(), TS to akceptuje
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // ignore errors
          }
        },
      },
    },
  );

  return supabase;
}