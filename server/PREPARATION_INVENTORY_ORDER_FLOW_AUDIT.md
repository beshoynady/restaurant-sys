# Preparation / Inventory / Order Flow — Business Decision Matrix Audit

**Scope:** `sales/order` (`order.service.js`, `order-settings`), `inventory/inventory-settings`, `inventory/recipe-consumption`, `preparation/preparation-ticket`, `preparation/preparation-section`.

**Reference:** Business Decision Matrix, Chapter 21 (`§21.3` Order Acceptance, `§21.4` Order Cancellation, `§21.5` Kitchen Workflow, `§21.6` Negative Stock) — supplied inline in chat, not yet a committed repo file. No `ERP_BUSINESS_ARCHITECTURE.md` exists in this repository; this document treats Chapter 21 as the business-rules reference by the project owner's explicit instruction.

**Method:** every claim below is verified against current source (file:line), not inferred from schema field names or prior documentation. Read-only audit — no code changed as part of producing this document. §21.5's gap (the trigger-point setting) was already closed in the immediately preceding change in this session (`inventoryDeductionTrigger` — see §3 below); this document covers what's still open and what was found *while* verifying that fix.

---

## 1. Current architecture

```
Order.transition(OPEN -> IN_PROGRESS)                     [order.service.js:95-134]
  |
  +--> preparationTicketService.createTicketsFromOrder()   [unconditional, best-effort]
  |       groups order items by Product.preparationSection
  |       creates one PreparationTicket per section
  |
  +--> (if InventorySettings.inventoryDeductionTrigger === ON_ORDER_CONFIRM)
  |     recipeConsumptionService.consumeForOrder()          [best-effort]
  |       expands combos -> resolves Recipe per product
  |       groups ingredients by destination Warehouse
  |       posts one WarehouseDocument (Issuance) per warehouse
  |       posts one COGS JournalEntry (sourceRef = order._id)
  |
  +--> domainEvents.emit(ORDER_CONFIRMED)                   [zero subscribers]

PreparationTicket.update() [preparation-ticket.service.js:43-107]
  preparationStatus: PENDING -> PREPARING -> READY (-> CANCELLED/REJECTED from PENDING/PREPARING)
  deliveryStatus:    WAITING -> READY_FOR_HANDOVER -> HANDED_OVER
  each transition is an atomic findOneAndUpdate claim (TOCTOU-safe)
  +--> (if inventoryDeductionTrigger matches ON_PREP_START / ON_PREP_END / ON_DELIVERY)
        recipeConsumptionService.consumeForTicket()         [best-effort, per-ticket, own sourceRef]

InventorySettings (per brand[/branch])
  inventoryDeductionTrigger: ON_ORDER_CONFIRM|ON_PREP_START|ON_PREP_END|ON_DELIVERY|MANUAL_ONLY
  allowNegativeStock: boolean  — enforced in inventory.service.js#applyOutbound (atomic $gte guard)
  recipeConsumptionStrategy: WAREHOUSE_DIRECT|PREPARATION_INVENTORY|HYBRID — WHERE, not WHEN

PreparationSectionConfig (per brand[/branch], per station)
  pure structural/config model — station type, linked Warehouse, staffing, working hours,
  averagePreparationTime (read), maxParallelTickets (read) — no decision logic of its own
```

Two settings models govern this flow — `InventorySettings` (real, mostly wired) and `OrderSettings` (schema-rich, almost entirely unwired) — plus a third, `PreparationSectionConfig`, which is structural only and makes no decisions itself.

---

## 2. Problems

### 2.1 `OrderSettings` is a "designed but dead" model — 15 of 17 checked fields are never read

Verified by whole-tree grep (excluding the module's own model/service/controller/validation files) — every field below is schema'd, exposed over the API via the standard CRUD router, and **read by zero business logic anywhere**:

| Field | Business Decision Matrix mapping |
|---|---|
| `preventNegativeStockOrders` | §21.6 — **conflicts with** `InventorySettings.allowNegativeStock`, which *is* the one actually enforced (see §2.2) |
| `autoSendOrderToPreparationSection`, `autoSendOrderToPreparationAfterTime` | Ticket creation is unconditional today regardless of these |
| `allowEditOrderAfterSendToKitchen` | No order-edit endpoint checks this |
| `autoMergeTickets` | No merge logic exists in `preparation-ticket.service.js`; a same-name field also exists, separately dead, on `PreparationTicketSettings` |
| `holdOrdersAllowed`, `maxHoldOrdersPerCashier`, `autoResumeHoldOrder` | No `HOLD` status exists on `Order.status` at all (enum is `OPEN/IN_PROGRESS/READY/DELIVERED/CLOSED/CANCELLED`) — the hold *feature* isn't just unwired, it structurally cannot exist yet |
| `allowPriceChange`, `allowQuantityChange` | No order-line-edit endpoint checks either |
| `allowSplitPayment`, `allowPartialPayment` | No payment-recording logic in this module reads either |
| `maxTimeToSendToPreparationSection`, `maxTimeToServe` | No SLA/timeout job exists anywhere (matches the platform-wide "no scheduler" gap already on record) |
| `autoCloseOrderAfterPayment`, `autoCloseOrderAfterTime` | No auto-close logic anywhere; `CLOSED` is only reachable from `DELIVERED`, manually |
| `allowRejectTickets` | Dead on **both** `OrderSettings` and `PreparationSectionConfig` (§2.4) |

Only `cancelReasonRequired` and `requireManagerApprovalForCancel` are real (`order.service.js:163-164`).

### 2.2 Negative-stock policy is declared in two places; only one is real

`OrderSettings.preventNegativeStockOrders` (order-level intent) and `InventorySettings.allowNegativeStock` (inventory-level enforcement) both exist. Only the latter is ever read (`inventory.service.js`'s `applyOutbound`, via `warehouse-document.service.js`). This is exactly the kind of "incorrect boundary" §21.17 warns about — the decision is currently owned correctly (Inventory Controller domain, per §21.17's ownership table), but the dead duplicate on `OrderSettings` invites a future developer to wire the wrong one, or to assume order-level and inventory-level policy can diverge when in practice only one of them can ever take effect.

### 2.3 §21.3 (Order Acceptance Decision) has no implementation at all

Chapter 21.3 specifies three modes — Auto Approve, Require Approval, Manual Review — selected by order source/value/customer/payment method, with a `Pending Approval` outcome distinct from `Confirmed`. Current `order.service.js` has none of this: `transition()` enforces only the state-machine shape (`transitionGuard`), with no business-rule evaluation before `OPEN -> IN_PROGRESS`. There is no `PENDING_APPROVAL` order status, no value-threshold check, no source-based branching. Every order that reaches `transition()` confirms unconditionally (subject only to the state machine and the two best-effort side effects).

### 2.4 §21.4 (Order Cancellation Decision) is partially implemented, but not state-aware

What exists (`cancelItem()`, `order.service.js:158-232`) is real and correctly wired: `cancelReasonRequired` and `requireManagerApprovalForCancel` are read from `OrderSettings` and enforced, with a proper second-approver permission check (`_hasCancelApprovalPermission`). What's missing against §21.4's actual matrix:
- The matrix specifies **three different regimes** based on where the item is in its lifecycle (before kitchen processing: free cancel; after prep started: needs approval; after payment: refund workflow, no delete). The current code applies **one flat rule** (`requireManagerApprovalForCancel`) regardless of whether the item is still `NEW` or already `PREPARING` — it doesn't distinguish "not started yet" from "already being cooked" the way the business rule requires.
- There is no payment-status check at all in `cancelItem()` — cancelling an item on an order that has already been (partially) paid does not route to any refund workflow; it just cancels the item the same way as an unpaid one. §21.4 is explicit that a paid order must never be silently cancelled without a refund path.

### 2.5 `PreparationSectionConfig` carries four fields with real names and zero behavior

`requireConfirmationBeforeSend`, `autoAssignChef`, `isDeliveryRelevant`, `workingHours` — all schema'd, all documented with clear intent in inline comments, none read anywhere outside the model file itself (verified by grep). `averagePreparationTime` and `maxParallelTickets` are the only two fields on this model actually consumed (both by `preparation-ticket.service.js`, for `expectedReadyAt` and station utilization respectively).

### 2.6 Missing event integrations (cross-checked against the earlier Architecture Deep Audit)

`domainEvents.js` already catalogs `Order.Confirmed` and `Order.ItemCancelled`, both emitted, both with **zero subscribers**. This audit's scope makes one gap concrete: nothing subscribes to `Order.Confirmed` to, e.g., notify a loyalty engine, a notification service, or an analytics sink — the event exists structurally but the flow chapter 21 implies (Order → Kitchen → Inventory → ... → Notifications) stops at Kitchen/Inventory, which are wired via **direct calls**, not the event bus at all. The event bus and the real flow are two disconnected mechanisms today.

---

## 3. What's already fixed (this session, prior to this audit)

`InventorySettings.inventoryDeductionTrigger` (replacing the dead `autoDeductOnOrder` boolean) now genuinely selects among `ON_ORDER_CONFIRM` / `ON_PREP_START` / `ON_PREP_END` / `ON_DELIVERY` / `MANUAL_ONLY`, closing §21.5 exactly as specified, with per-ticket (not per-order) consumption for the three station-level modes so multi-station orders don't double- or under-deduct. Default `ON_ORDER_CONFIRM` preserves prior behavior for every existing brand. Files: `inventory-settings.model.js`, `inventory-settings.service.js`, `recipe-consumption.service.js`, `order.service.js`, `preparation-ticket.service.js`.

---

## 4. Recommended changes (not yet implemented — for approval)

Ranked by how directly each maps to a Chapter 21 rule vs. how large the change is:

1. **Resolve the negative-stock duplicate (§2.2).** Recommend deleting `OrderSettings.preventNegativeStockOrders` outright (dead, and `InventorySettings.allowNegativeStock` is the correct single owner per §21.17's ownership table — Inventory Controller, not Order/Operations). Smallest, safest change in this list.
2. **Implement §21.3's Order Acceptance Decision** as a new `beforeTransition` check in `order.service.js`, reading new `OrderSettings` fields (e.g. `orderApprovalMode: AUTO|REQUIRE_APPROVAL|MANUAL_REVIEW`, `approvalThresholdAmount`) — requires a new `Order.status` value (`PENDING_APPROVAL`) and a transition-guard edge `OPEN -> PENDING_APPROVAL -> IN_PROGRESS`. This is a real state-machine change, not just a settings read — needs explicit sign-off on the new status before implementation, since it changes `Order`'s schema-level contract.
3. **Make §21.4 cancellation state-aware.** Branch `cancelItem()`'s approval requirement on the item's current status (`NEW` → free; `SENT_TO_PRODUCTION`/`PREPARING` → require approval) instead of one blanket setting, and add a payment-status guard that routes to a refund flow instead of a plain cancel once any payment has been recorded against the order. The refund flow itself is out of scope here (no refund engine exists in this module set) — this item should be scoped down to "block/redirect," not "build refunds," unless that's explicitly wanted too.
4. **Decide the fate of the other 14 dead `OrderSettings` fields (§2.1).** Two of the three (hold orders, SLA timers) require infrastructure this platform doesn't have yet (a `HOLD` status; a scheduler — see the Backend Knowledge Base's confirmed-absent list). Recommend a explicit triage pass, not a silent bulk-delete: which are genuinely planned (keep, get a milestone), vs. speculative (delete).
5. **Wire `PreparationSectionConfig`'s four dead fields (§2.5) or remove them.** `requireConfirmationBeforeSend` and `autoAssignChef` are the two most implementable without new infrastructure — both are pure "check a flag before/during `createTicketsFromOrder`" changes.
6. **Subscribe something to `Order.Confirmed`** if the Chapter 21 vision (Order → ... → Loyalty → Notifications → Audit) is meant to happen automatically rather than manually — currently nothing does.

None of the above is implemented. Item 2 in particular is a schema change (new `Order.status` value) and needs explicit approval before touching `order.model.js`.

---

## 5. Required services (if the above is approved)

| Change | New/changed service surface |
|---|---|
| §21.3 Order Acceptance | `order.service.js`: new `beforeTransition` or pre-check inside `transition()`; possibly a new `orderApprovalService` if the rule set grows beyond a simple threshold check |
| §21.4 state-aware cancellation | `order.service.js#cancelItem` — branch on `item.status`, add a payment-status guard. No new service class needed. |
| Negative-stock dedup | `order-settings.model.js` schema edit only — no service change |
| Dead `PreparationSectionConfig` fields | `preparation-ticket.service.js#createTicketsFromOrder` — read `requireConfirmationBeforeSend`/`autoAssignChef` from the resolved section doc (already fetched at line 122) |

No new top-level module or domain is implied by anything found in this audit — every recommendation above is a change inside the five modules already in scope.

## 6. Required events

- `Order.PendingApproval` (new) — if §21.3 is implemented, needed to notify whoever approves.
- `Order.ApprovalGranted` / `Order.ApprovalRejected` (new) — same.
- Existing `Order.Confirmed` / `Order.ItemCancelled` need at least one real subscriber for the Chapter 21 flow to be more than a diagram — which subscriber (Notifications? Loyalty? Audit, beyond the existing `auditLogger` middleware which is HTTP-driven, not event-driven?) is a product decision, not an architecture one, and isn't decided by this audit.

## 7. Database relations touched by the recommendations above

- `Order.status` enum gains `PENDING_APPROVAL` (if §21.3 is approved) — additive, no migration needed for existing rows (they're never in that state).
- `Order.items[].status` already has the granularity §21.4 needs (`NEW/SENT_TO_PRODUCTION/PREPARING/...`) — no schema change needed there, only service logic.
- `OrderSettings` loses `preventNegativeStockOrders` (recommendation 1) — safe, field is confirmed dead, no data migration concern (removing an unread field).
- No changes recommended to `PreparationTicket`, `PreparationSectionConfig`, `InventorySettings`, `Recipe`, `StockItem`, or any accounting model — the existing relationships (documented in the Architecture Deep Audit §04) are sufficient for everything in §4.

---

**Status: awaiting approval.** No implementation from §4 onward has been started. Per the operating instruction this document was produced under, code changes resume only after explicit sign-off on which of the six recommended items (and which sub-decisions — the new `Order.status` value in particular) to proceed with.
