import { cookies } from "next/headers";
import { authConfig, principal, sameOrigin } from "@/lib/server/session";
import { preferencesSchema } from "@/lib/server/validation";
import { defaultPreferences, defaultAddress } from "@/lib/domain";
import { z } from "zod";
async function customerClient(expectedOwner?: string) {
  const user = await principal();
  const config = authConfig();
  if (expectedOwner && user.id !== expectedOwner)
    throw new Error("Your account changed. Reload before syncing preferences.");
  if (user.kind !== "account" || !config)
    throw new Error("Sign in to sync your account.");
  const token = (await cookies()).get("mf_access")!.value;
  return async (path: string, options: RequestInit = {}) => {
    const response = await fetch(`${config.url}/rest/v1/${path}`, {
      ...options,
      cache: "no-store",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    if (!response.ok)
      throw new Error(
        "Account sync is unavailable. Your changes are saved on this device. Check the Supabase migrations and connection.",
      );
    return response;
  };
}
export async function GET() {
  try {
    const db = await customerClient();
    const [profiles, addresses, saved] = await Promise.all(
      [
        "customer_profiles?select=*",
        "addresses?label=eq.Home&select=*",
        "saved_dishes?select=dish_id",
      ].map(async (p) => (await db(p)).json()),
    );
    const profile = profiles[0],
      address = addresses[0];
    return Response.json({
      exists: !!profile,
      preferences: profile
        ? {
            diets: profile.dietary_preferences,
            allergies: profile.allergies,
            disliked: profile.disliked_ingredients.join(", "),
            cuisines: profile.favorite_cuisines,
            budget: profile.budget_cents / 100,
            notifications: profile.notifications,
          }
        : defaultPreferences,
      address: address
        ? {
            street: address.street,
            apartment: address.apartment || "",
            city: address.city,
            zip: address.postal_code,
          }
        : defaultAddress,
      saved: saved.map((d: { dish_id: string }) => d.dish_id),
    });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
export async function PUT(request: Request) {
  try {
    sameOrigin(request);
    const state = z
      .object({
        ownerId: z.string().max(100),
        preferences: preferencesSchema,
        address: z.object({
          street: z.string().max(150),
          apartment: z.string().max(50),
          city: z.string().max(80),
          zip: z.string().regex(/^\d{5}$/),
        }),
        saved: z.array(z.string().max(60)).max(1000),
      })
      .parse(await request.json());
    const db = await customerClient(state.ownerId);
    await db("rpc/save_customer_state", {
      method: "POST",
      body: JSON.stringify({ p_state: state }),
    });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof z.ZodError
            ? "Your profile needs valid preferences and a ZIP code."
            : (e as Error).message,
      },
      { status: 400 },
    );
  }
}
