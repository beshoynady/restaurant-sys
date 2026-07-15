/**
 * Enterprise Production Platform — Combo Execution.
 *
 * The single, shared expansion of an Order's line items into their real, resolved products —
 * reused by BOTH `PreparationTicketService.createTicketsFromOrder()` and
 * `RecipeConsumptionService.consumeForOrder()`, so combo-expansion logic exists in exactly one
 * place, never duplicated across the two consumers that both need it (kitchen routing and
 * inventory consumption).
 *
 * A non-combo item expands to itself. A combo item (`comboSelections[]` present) expands into
 * each selected component, each carrying its own resolved quantity (selection quantity × the
 * order item's own quantity) — this is what makes a 2-component combo route to two different
 * kitchen sections and consume two different recipes, instead of being treated as one opaque
 * product with no recipe/section of its own.
 */
export function expandOrderItems(order) {
  const expanded = [];

  for (const item of order.items) {
    if (item.comboSelections && item.comboSelections.length > 0) {
      for (const selection of item.comboSelections) {
        expanded.push({
          orderItemId: item._id,
          product: selection.product,
          quantity: (selection.quantity || 1) * item.quantity,
          notes: item.notes,
          extras: [], // combo-level extras are not modeled per-component in this pass
          isComboComponent: true,
        });
      }
    } else {
      expanded.push({
        orderItemId: item._id,
        product: item.product,
        quantity: item.quantity,
        notes: item.notes,
        extras: item.extras || [],
        isComboComponent: false,
      });
    }
  }

  return expanded;
}
