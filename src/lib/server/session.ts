import "server-only";
import { publicDemo } from "./demo";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
export type Principal = {
  id: string;
  kind: "guest" | "account";
  email?: string;
};
export function authConfig() {
  if (publicDemo()) return null;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}
export async function principal(): Promise<Principal> {
  const jar = await cookies();
  const token = jar.get("mf_access")?.value;
  const config = authConfig();
  if (token && config) {
    const response = await fetch(`${config.url}/auth/v1/user`, {
      headers: { apikey: config.key, Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok)
      throw new Error(
        "Your sign-in expired. Please sign out and sign in again.",
      );
    const user = await response.json();
    return { id: `user:${user.id}`, kind: "account", email: user.email };
  }
  let id = jar.get("mf_guest")?.value;
  if (!id || !/^[a-f0-9]{64}$/.test(id)) {
    id = randomBytes(32).toString("hex");
    jar.set("mf_guest", id, {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.VERCEL === "1" || process.env.DEPLOYMENT_HTTPS === "true",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return { id: `guest:${id}`, kind: "guest" };
}
export { sameOrigin } from "./security";
