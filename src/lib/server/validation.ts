import { z } from "zod";
export const preferencesSchema = z.object({
  diets: z.array(z.string().max(40)).max(10),
  allergies: z.array(z.string().max(80)).max(30),
  disliked: z.string().max(500),
  cuisines: z.array(z.string().max(40)).max(20),
  budget: z.number().min(1).max(1000),
  notifications: z.boolean(),
});
export const cartSchema = z.object({
  restaurantId: z.string().nullable(),
  items: z
    .array(
      z.object({
        dishId: z.string().max(60),
        quantity: z.number().int().min(1).max(20),
        modifierIds: z.array(z.string().max(50)).max(20),
        instructions: z.string().max(500),
      }),
    )
    .min(1)
    .max(30),
});
export const addressSchema = z.object({
  street: z.string().trim().min(3).max(150),
  apartment: z.string().max(50),
  city: z.string().max(80),
  zip: z.string().regex(/^\d{5}$/),
});
export const checkoutSchema = z.object({
  key: z.string().uuid(),
  cart: cartSchema,
  address: addressSchema,
  preferences: preferencesSchema,
  instructions: z.string().max(500),
  acceptedTotal: z.number().int().positive(),
  allergenAcknowledged: z.literal(true),
});
