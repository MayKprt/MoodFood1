import { Cart, CartItem, Preferences, Quote, Address } from "./domain";
import { dishById, restaurantById } from "./data";
import { eligible } from "./recommendations";
export function addItem(cart: Cart, item: CartItem): Cart {
  const dish = dishById(item.dishId);
  if (!dish) throw new Error("This dish could not be found.");
  if (
    cart.restaurantId &&
    cart.restaurantId !== dish.restaurantId &&
    cart.items.length
  )
    throw new Error(
      "Your cart can contain dishes from one kitchen. Start a new cart to switch kitchens.",
    );
  if (
    !Number.isInteger(item.quantity) ||
    item.quantity < 1 ||
    item.quantity > 20
  )
    throw new Error("Choose a quantity between 1 and 20.");
  const match = cart.items.findIndex(
    (i) =>
      i.dishId === item.dishId &&
      [...i.modifierIds].sort().join(",") ===
        [...item.modifierIds].sort().join(",") &&
      i.instructions === item.instructions,
  );
  if (match >= 0 && cart.items[match].quantity + item.quantity > 20)
    throw new Error("A dish can have at most 20 portions in your cart.");
  return {
    restaurantId: dish.restaurantId,
    items:
      match < 0
        ? [...cart.items, item]
        : cart.items.map((i, n) =>
            n === match ? { ...i, quantity: i.quantity + item.quantity } : i,
          ),
  };
}
export function itemPrice(item: CartItem) {
  const dish = dishById(item.dishId);
  if (!dish) throw new Error("A dish is no longer available.");
  return (
    dish.price +
    item.modifierIds.reduce(
      (sum, id) => sum + (dish.modifiers.find((m) => m.id === id)?.price ?? 0),
      0,
    )
  );
}
export function quoteCart(cart: Cart): Quote {
  const subtotal = cart.items.reduce(
    (sum, i) => sum + itemPrice(i) * i.quantity,
    0,
  );
  const deliveryFee =
    cart.restaurantId && subtotal
      ? restaurantById(cart.restaurantId).deliveryFee
      : 0;
  const serviceFee = Math.round(subtotal * 0.05);
  const tax = Math.round((subtotal + serviceFee) * 0.08875);
  return {
    subtotal,
    deliveryFee,
    serviceFee,
    tax,
    total: subtotal + deliveryFee + serviceFee + tax,
  };
}
export function validateCart(cart: Cart, address: Address, prefs: Preferences) {
  if (!cart.items.length)
    throw new Error("Your cart is empty. Find something delicious first.");
  if (
    !address.street.trim() ||
    address.city.toLowerCase().trim() !== "brooklyn" ||
    !/^112(01|05|17|31)$/.test(address.zip)
  )
    throw new Error(
      "Demo delivery is available in Brooklyn ZIP codes 11201, 11205, 11217, and 11231. Enter a street address.",
    );
  cart.items.forEach((item) => {
    const dish = dishById(item.dishId);
    if (
      !dish ||
      dish.restaurantId !== cart.restaurantId ||
      !eligible(dish, { ...prefs, budget: Infinity }, address.zip)
    )
      throw new Error(
        "A dish is unavailable or conflicts with your current dietary restrictions. Please review your cart.",
      );
    if (
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 20
    )
      throw new Error("Choose a quantity between 1 and 20.");
    if (
      new Set(item.modifierIds).size !== item.modifierIds.length ||
      item.modifierIds.some((id) => !dish.modifiers.some((m) => m.id === id))
    )
      throw new Error("A selected option is no longer available.");
  });
  return quoteCart(cart);
}
