import { z } from "zod";
import { interpret } from "@/lib/server/ai";
import { sameOrigin } from "@/lib/server/session";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { text } = z
      .object({ text: z.string().max(500) })
      .parse(await request.json());
    return Response.json(await interpret(text));
  } catch {
    return Response.json(
      { error: "Please keep your food request under 500 characters." },
      { status: 400 },
    );
  }
}
