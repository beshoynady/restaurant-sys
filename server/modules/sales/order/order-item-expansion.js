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
 *
 * Enterprise Restaurant Operations Platform — Modifier Engine: `selectedModifiers[]` is carried
 * through on every resolved (non-combo) item exactly like `extras[]` already is — both consumers
 * (ticket creation, recipe consumption) already treat "things nested on the base item, never
 * independently routed, but which may consume their own recipe" as one concept; modifiers are
 * that same concept with real group/selection validation on top, not a second, parallel one.
 * Combo-component-level modifiers are not modeled in this pass (same honest scoping already
 * applied to combo-component-level extras above).
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
          extras: [], // combo-level extras/modifiers are not modeled per-component in this pass
          selectedModifiers: [],
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
        selectedModifiers: item.selectedModifiers || [],
        isComboComponent: false,
      });
    }
  }

  return expanded;
}
