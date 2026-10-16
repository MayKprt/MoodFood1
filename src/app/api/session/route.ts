import { principal, authConfig } from "@/lib/server/session";
export async function GET() {
  try {
    const user = await principal();
    return Response.json({ user, authConfigured: !!authConfig() });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 401 });
  }
}
