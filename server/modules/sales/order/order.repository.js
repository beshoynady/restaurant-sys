// Repository layer (BACKEND_FOUNDATION.md §4.3 / REPOSITORY_PATTERN_MIGRATION_PLAN.md): owns ALL
// database access for Order — generic CRUD + constructor options only. order.service.js (same
// directory — flat, suffix-named module structure, not a subfolder split) extends this class and
// adds every business rule (order-number generation, state-machine transitions, item
// cancel/kitchen-recall) on top — none of that belongs here.
import BaseRepository from "../../../utils/BaseRepository.js";
import OrderModel from "./order.model.js";

class OrderRepository extends BaseRepository {
  constructor() {
    super(OrderModel, {
      brandScoped: true,
      // PLATFORM_FINAL_AUDIT.md PA-03, corrected: Order is a transactional
      // document with its own status lifecycle (OPEN/IN_PROGRESS/READY/
      // DELIVERED/CLOSED/CANCELLED) — soft-delete is not the right model
      // for it; a mistaken order is cancelled via `status`, not deleted.
      enableSoftDelete: false,
      // DB-016 minimal compatibility update (retained): "user" removed (field no longer exists —
      // Order.customer is now a single polymorphic reference, see order.model.js).
      defaultPopulate: ["brand", "branch", "cashierShift", "staffMember", "table", "orderBy", "customer"],
      searchableFields: [],
      defaultSort: { createdAt: -1 },
      // `OrderService` overrides `beforeCreate` (order-number generation, modifier validation)
      // but never overrode `beforeUpdate` — so the generic `PUT /orders/:id` could set `status`
      // straight to any value (bypassing `transitionGuard`/`transition()` entirely),
      // `paymentStatus`, `orderNum`, or any item's price with zero re-validation. These fields may
      // only change through their dedicated service methods (`transition()`, `cancelItem()`, the
      // atomic order-number generator in `beforeCreate`) from now on — a plain `PUT` silently
      // drops them rather than applying them.
      lockedUpdateFields: ["status", "paymentStatus", "orderNum", "items"],
    });
  }
}

export default OrderRepository;
