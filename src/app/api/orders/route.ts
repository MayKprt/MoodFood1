import { principal, sameOrigin } from "@/lib/server/session";
import { checkoutSchema } from "@/lib/server/validation";
import { createOrder, getOrders } from "@/lib/server/orders";
import { z } from "zod";
export async function GET() {
  try {
    const user = await principal();
    return Response.json({ orders: await getOrders(user.id) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = await principal();
    const body = checkoutSchema.parse(await request.json());
    const order = await createOrder(
      user.id,
      body.key,
      body.cart,
      body.address,
      body.preferences,
      body.instructions,
      body.acceptedTotal,
    );
    return Response.json({ order }, { status: 201 });
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof z.ZodError
            ? "Check your cart, address, and allergen acknowledgement."
            : (e as Error).message,
      },
      { status: 400 },
    );
  }
}
