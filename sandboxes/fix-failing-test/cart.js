// A tiny module for the hero scenario.
// applyDiscount never produces a negative price; it clamps at zero.
export function applyDiscount(price, pct) {
  return Math.max(0, price - price * (pct / 100));
}
