import { cookies } from "next/headers";
import { authConfig, sameOrigin } from "@/lib/server/session";
import { z } from "zod";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = z
      .object({
        action: z.enum(["signin", "signup", "signout"]),
        email: z.email().optional(),
        password: z.string().min(8).max(128).optional(),
      })
      .parse(await request.json());
    const jar = await cookies();
    if (body.action === "signout") {
      jar.delete("mf_access");
      return Response.json({ ok: true });
    }
    const config = authConfig();
    if (!config)
      return Response.json(
        {
          error:
            "Account sign-in is not configured. You can explore, save dishes, and place demo orders as a guest.",
        },
        { status: 503 },
      );
    if (!body.email || !body.password)
      throw new Error(
        "Enter an email and a password of at least 8 characters.",
      );
    const result = await fetch(
      `${config.url}/auth/v1/${body.action === "signup" ? "signup" : "token?grant_type=password"}`,
      {
        method: "POST",
        headers: { apikey: config.key, "Content-Type": "application/json" },
        body: JSON.stringify({ email: body.email, password: body.password }),
      },
    );
    const data = await result.json();
    if (!result.ok)
      throw new Error(
        data.msg ||
          data.error_description ||
          "Sign-in failed. Please check your details.",
      );
    if (data.access_token)
      jar.set("mf_access", data.access_token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.DEPLOYMENT_HTTPS === "true",
        path: "/",
        maxAge: data.expires_in || 3600,
      });
    return Response.json({
      ok: true,
      confirmationRequired: !data.access_token,
    });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof z.ZodError
            ? "Check your email and use a password of at least 8 characters."
            : (e as Error).message,
      },
      { status: 400 },
    );
  }
}
