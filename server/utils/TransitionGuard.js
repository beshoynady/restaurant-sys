import throwError from "./throwError.js";

/**
 * Generic Workflow / Transition Guard Engine — Supply Chain & Commerce Platform V5.
 *
 * SUPPLY_CHAIN_COMMERCE_DOMAIN_REDESIGN.md §5.3 formalized every status enum in this domain
 * (PurchaseOrder, GoodsReceiptNote, PurchaseInvoice, PurchaseReturnInvoice, Order, Invoice,
 * SalesReturn, InventoryCount, StockTransferRequest) as an explicit transition table instead of an
 * unguarded flat enum. This is the one shared implementation of "is this status change allowed" —
 * every module below defines its own table and creates one guard instance, instead of hand-rolling
 * the same if/else chain seven-plus times (the audit's confirmed finding: every status field in
 * this domain allowed any value to jump to any other via a generic PUT, guarded only by RBAC, not
 * business rules).
 */
class TransitionGuard {
  /** @param {Record<string,string[]>} transitions - map of fromState -> allowed toStates */
  constructor(transitions) {
    this.transitions = transitions;
  }

  canTransition(fromState, toState) {
    if (fromState === toState) return false; // a "transition" to the same state is a no-op, not a valid move
    return (this.transitions[fromState] || []).includes(toState);
  }

  /** Throws a 409 with a clear message if the transition isn't allowed; returns silently otherwise. */
  assertValid(fromState, toState) {
    if (!this.canTransition(fromState, toState)) {
      throwError(`Cannot transition from "${fromState}" to "${toState}".`, 409);
    }
  }

  /** States with no outgoing transitions at all — useful for callers that want to reject any
   * further mutation attempt with a clearer message than a generic transition failure. */
  isTerminal(state) {
    return !this.transitions[state] || this.transitions[state].length === 0;
  }
}

export function createTransitionGuard(transitions) {
  return new TransitionGuard(transitions);
}

export default TransitionGuard;
