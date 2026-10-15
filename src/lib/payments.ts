// A future Stripe adapter accepts a provider token/payment-intent id, never raw card data.
export interface PaymentProvider {
  readonly name: string;
  authorize(request: {
    idempotencyKey: string;
    amountCents: number;
    currency: "USD";
  }): Promise<{ status: "demo" | "authorized"; providerReference: string }>;
}
export class DemoPaymentProvider implements PaymentProvider {
  readonly name = "Demo payment — no charge";
  async authorize(request: {
    idempotencyKey: string;
    amountCents: number;
    currency: "USD";
  }) {
    if (!Number.isInteger(request.amountCents) || request.amountCents <= 0)
      throw new Error("Invalid demo payment amount.");
    return {
      status: "demo" as const,
      providerReference: `demo:${request.idempotencyKey}`,
    };
  }
}
