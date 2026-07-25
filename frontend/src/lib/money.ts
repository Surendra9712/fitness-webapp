import { z } from "zod";

/** Smallest currency unit we accept — 1 paisa. */
export const PRICE_STEP = "0.01";

/**
 * A rupee amount: positive and no finer than paisa.
 *
 * `products.price` is DECIMAL(10,2), so a third decimal would be rounded away
 * server-side and the saved value would silently differ from what was typed.
 * Rejecting it here means the value that gets saved is exactly the value sent.
 */
export const priceSchema = z.coerce
  .number()
  .positive("Price must be greater than 0")
  .refine((n) => Number.isFinite(n) && Number(n.toFixed(2)) === n, {
    message: "Price can have at most 2 decimal places",
  });
