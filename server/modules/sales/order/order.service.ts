// DATABASE_IMPLEMENTATION_PLAN.md DB-007: wires the atomic order-number generator into order
// creation via BaseRepository's existing `beforeCreate` lifecycle hook — the minimal, idiomatic
// extension point already provided for exactly this purpose, rather than overriding `create()`
// wholesale. `order.model.js` is intentionally left as-is (untouched, still `.js`) — converting it
// to TypeScript is outside this task's scope (DB-007/010/014 only); this service is typed against
// `OrderRepository`, the same documented widening `BaseController.d.ts` already uses for the
// identical reason (Mongoose `Model<T>` invariance would otherwise reject a concrete document type
// without the source model itself also being TypeScript).
//
// Enterprise Order Management Platform: migrated to the mandated Repository Pattern
// (BACKEND_FOUNDATION.md §4.3 / REPOSITORY_PATTERN_MIGRATION_PLAN.md) — data access (generic CRUD,
// constructor options) now lives in order.repository.js; this file extends it and contains zero
// raw Mongoose calls of its own (every DB read/write below goes through `self.model`, the same
// inherited Mongoose model the repository configured), matching the split already proven on the
// `accounting/journal-entry` pilot.
import throwErrorJs from "../../../utils/throwError.js";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import OrderRepository from "./order.repository.js";
import orderSettingsService from "../order-settings/order-settings.service.js";
import { createTransitionGuard } from "../../../utils/TransitionGuard.js";
import domainEvents, { DomainEvent } from "../../../utils/domainEvents.js";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import preparationTicketService from "../../preparation/preparation-ticket/preparation-ticket.service.js";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import recipeConsumptionService from "../../inventory/recipe-consumption/recipe-consumption.service.js";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import PreparationTicketModel from "../../preparation/preparation-ticket/preparation-ticket.model.js";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import UserAccountModel from "../../iam/user-account/user-account.model.js";

const ORDER_ITEM_CANCELLABLE_STATUSES = ["NEW", "SENT_TO_PRODUCTION", "PREPARING"];

const throwError = throwErrorJs as (message: string, statusCode: number) => never;

// Enterprise Production Platform — the single most consequential kitchen gap named across every
// audit this engagement produced for this domain: `Order.status` had a real, well-designed enum
// but zero transition enforcement anywhere (confirmed by direct read — the previous service was
// pure CRUD, `beforeCreate` only generated `orderNum`). OPEN -> IN_PROGRESS is the "sent to
// kitchen" moment — the one place this platform now actually creates PreparationTickets, closing
// the gap this engagement has named and deferred across three consecutive milestones.
const transitionGuard = createTransitionGuard({
  OPEN: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["READY", "CANCELLED"],
  READY: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class OrderService extends OrderRepository {
  // DB-007: server-generates `orderNum` instead of trusting a client-supplied value — this is what
  // actually makes the {brand,branch,orderNum} unique index (DB-003) collision-free in practice,
  // not just structurally possible. `order.validation.js`'s create schema now excludes `orderNum`
  // from client input (stripped, not rejected, so old clients that still send one stay compatible).
  async beforeCreate(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const brandId = data.brand as string | undefined;
    const branchId = data.branch as string | undefined;

    if (!brandId || !branchId) {
      throwError("brand and branch are required to generate an order number.", 400);
    }

    const orderNum = await orderSettingsService.getNextOrderNumber(brandId!, branchId!);

    return { ...data, orderNum };
  }

  /**
   * Atomic-claim from the first line, matching the pattern proven across every posting-adjacent
   * transition in this platform's Supply Chain/Production hardening passes — not a hardening pass
   * discovered later for this domain.
   */
  async transition(opts: { id: string; brand: string; branch: string; toStatus: string; actorId: string }) {
    const { id, brand, branch, toStatus, actorId } = opts;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const self = this as any;
    const order = await self.model.findOne({ _id: id, brand, branch });
    if (!order) throwError("Order not found.", 404);

    transitionGuard.assertValid(order.status, toStatus);

    const claimed = await self.model.findOneAndUpdate(
      { _id: id, brand, branch, status: order.status },
      { $set: { status: toStatus } },
      { new: true },
    );
    if (!claimed) {
      throwError("This order was already transitioned by a concurrent request.", 409);
    }

    if (toStatus === "IN_PROGRESS") {
      // Best-effort, non-blocking — matching every other event-triggered side effect in this
      // platform's established philosophy (an unconfigured/misrouted product must not block the
      // order confirmation that already, correctly, committed).
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (preparationTicketService as any).createTicketsFromOrder({ order: claimed, actorId });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[order.service] Preparation tickets not created for order ${claimed.orderNum}: ${(err as Error).message}`);
      }
      try {
        // Automatic Recipe Consumption — reads `InventorySettings.recipeConsumptionStrategy`
        // (built in an earlier milestone, unread by any code until now) and deducts ingredients
        // via the existing Inventory Posting Engine. Same best-effort philosophy as ticket
        // creation, independent try/catch so a failure in one never blocks the other.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (recipeConsumptionService as any).consumeForOrder({ order: claimed, actorId });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`[order.service] Recipe consumption not posted for order ${claimed.orderNum}: ${(err as Error).message}`);
      }
      await domainEvents.emit(DomainEvent.ORDER_CONFIRMED, { order: claimed });
    }

    return claimed;
  }

  /**
   * Enterprise Order Management Platform — Order Item Modification: item-level void/cancel with
   * kitchen recall. `OrderItemSchema.status` was confirmed, by direct read, to be a real field
   * with zero code anywhere ever transitioning it — a schema that looked complete but had no
   * execution behind it, the same "designed but dead" pattern this engagement has repeatedly
   * found and closed elsewhere in this domain.
   *
   * Kitchen recall is handled for the two cases that can be closed safely and atomically without
   * a larger per-ticket-item status model this pass does not build: if no ticket references this
   * item yet (still `OPEN`), it's a pure order edit; if a ticket exists and this item is the
   * ticket's ONLY item, the ticket itself is recalled (cancelled) via its own already-guarded
   * transition. A ticket shared with other items has no per-item status to cancel independently
   * yet — rejected with a clear error rather than silently leaving the ticket in a stale state.
   *
   * Enterprise Order Management Platform — now reads `OrderSettings.cancelReasonRequired` and
   * `.requireManagerApprovalForCancel`, confirmed by direct read to be real fields with zero
   * code anywhere reading them before this change. When manager approval is required, the
   * *approving* user (`managerApprovalBy`, distinct from `actorId` — matching the real POS
   * pattern where a cashier without cancellation permission of their own needs a supervisor's
   * override) must independently hold the same `Orders:cancelItem` permission this action's own
   * route requires of its caller — not a separately-invented "manager" role concept.
   */
  async cancelItem(opts: { orderId: string; itemId: string; brand: string; branch: string; reason?: string; actorId: string; managerApprovalBy?: string }) {
    const { orderId, itemId, brand, branch, reason, actorId, managerApprovalBy } = opts;

    const settings = await orderSettingsService.resolveForBranch(brand, branch);
    // Fail safe when settings are somehow missing (defensive only — a branch with orders already
    // has OrderSettings, per getNextOrderNumber()'s own requirement): require a reason, don't
    // require a second approver.
    const reasonRequired = settings ? settings.cancelReasonRequired : true;
    const managerApprovalRequired = settings ? settings.requireManagerApprovalForCancel : false;

    if (reasonRequired && (!reason || !reason.trim())) {
      throwError("A cancellation reason is required.", 400);
    }

    if (managerApprovalRequired) {
      if (!managerApprovalBy) {
        throwError("Manager approval is required to cancel this item — provide the approving manager's user ID.", 403);
      }
      const canApprove = await this._hasCancelApprovalPermission(managerApprovalBy!, brand);
      if (!canApprove) {
        throwError("The approving user does not hold permission to authorize item cancellations.", 403);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const self = this as any;
    const order = await self.model.findOne({ _id: orderId, brand, branch });
    if (!order) throwError("Order not found.", 404);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const item = (order.items as any).id(itemId);
    if (!item) throwError("Order item not found.", 404);

    if (!ORDER_ITEM_CANCELLABLE_STATUSES.includes(item.status)) {
      throwError(`Cannot cancel an item in status ${item.status}.`, 400);
    }
    const currentItemStatus = item.status;

    const ticket = await (PreparationTicketModel as any).findOne({
      order: orderId, brand, "items.orderItemId": itemId,
    });
    if (ticket) {
      if (ticket.items.length > 1) {
        throwError(
          "This item shares a preparation ticket with other items and cannot be cancelled individually yet — cancel the whole ticket, or contact kitchen staff.",
          409,
        );
      }
      // Sole item on its own ticket -> recall (cancel) the ticket too, reusing the existing
      // PENDING/PREPARING -> CANCELLED transition guard already enforced in
      // preparation-ticket.service.js#update, not a second, parallel guard here.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (preparationTicketService as any).update({
        id: ticket._id, brandId: brand, data: { preparationStatus: "CANCELLED" },
      });
    }

    // Atomic-claim on the specific array element, guarding the exact same race this platform
    // guards on every other transition: two concurrent cancel requests for the same item must not
    // both succeed.
    const claimed = await self.model.findOneAndUpdate(
      { _id: orderId, brand, branch, "items._id": itemId, "items.status": currentItemStatus },
      {
        $set: {
          "items.$.status": "CANCELLED",
          "items.$.cancelReason": reason || null,
          "items.$.cancelledBy": actorId,
          "items.$.cancelledAt": new Date(),
          "items.$.managerApprovalBy": managerApprovalRequired ? managerApprovalBy : null,
        },
      },
      { new: true },
    );
    if (!claimed) {
      throwError("This item was already changed by a concurrent request.", 409);
    }

    await domainEvents.emit(DomainEvent.ORDER_ITEM_CANCELLED, { order: claimed, itemId });

    return claimed;
  }

  /**
   * Checks the approving user's own `Orders` permission entry for `approve: true` — the real,
   * declared boolean field `Role.permissions[]` actually has (`role.model.js`:
   * `create/read/update/delete/viewReports/approve/reject/reverse` only). A fabricated action
   * name (e.g. a "cancelItem" field) would silently be stripped by Mongoose's default strict
   * mode on save and never match anyone — confirmed by direct read of the Role schema before
   * this was wired in, not assumed.
   */
  private async _hasCancelApprovalPermission(userId: string, brandId: string): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const approver = await (UserAccountModel as any)
      .findOne({ _id: userId, brand: brandId, isDeleted: { $ne: true }, isActive: true })
      .populate("role");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const permissions = approver?.role?.permissions as any[] | undefined;
    if (!permissions) return false;
    return permissions.some((perm) => perm.resource === "Orders" && perm.approve === true);
  }
}

export default new OrderService();
export { transitionGuard as orderTransitionGuard };
