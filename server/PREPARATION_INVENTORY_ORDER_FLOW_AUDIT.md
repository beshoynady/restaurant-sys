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

### 2.2 Negative-stock policy is declared in two places; only one is real — **RESOLVED 2026-07-17**

`OrderSettings.preventNegativeStockOrders` (order-level intent) and `InventorySettings.allowNegativeStock` (inventory-level enforcement) both existed. Only the latter was ever read (`inventory.service.js`'s `applyOutbound`, via `warehouse-document.service.js`). This was exactly the kind of "incorrect boundary" §21.17 warns about — the decision was owned correctly (Inventory Controller domain, per §21.17's ownership table), but the dead duplicate on `OrderSettings` invited a future developer to wire the wrong one, or to assume order-level and inventory-level policy could diverge when in practice only one of them could ever take effect.

**Fixed:** `preventNegativeStockOrders` removed from `order-settings.model.js` (verified zero references anywhere else in the repo — model, service, controller, validation, router, tests, fixtures, docs other than this audit doc itself and `CLAUDE.md`'s index entry — before deletion). `InventorySettings.allowNegativeStock` is now the sole, unambiguous source of truth for this decision. See recommendation 1 in §4, now implemented.

### 2.3 §21.3 (Order Acceptance Decision) has no implementation at all

Chapter 21.3 specifies three modes — Auto Approve, Require Approval, Manual Review — selected by order source/value/customer/payment method, with a `Pending Approval` outcome distinct from `Confirmed`. Current `order.service.js` has none of this: `transition()` enforces only the state-machine shape (`transitionGuard`), with no business-rule evaluation before `OPEN -> IN_PROGRESS`. There is no `PENDING_APPROVAL` order status, no value-threshold check, no source-based branching. Every order that reaches `transition()` confirms unconditionally (subject only to the state machine and the two best-effort side effects).

### 2.4 §21.4 (Order Cancellation Decision) is partially implemented, but not state-aware — **RESOLVED 2026-07-18 (phase-awareness); payment-status gating documented as blocked, not built**

What existed (`cancelItem()`, pre-fix) was real and correctly wired: `cancelReasonRequired` and `requireManagerApprovalForCancel` read from `OrderSettings` and enforced, with a proper second-approver permission check (`_hasCancelApprovalPermission`). What was missing against §21.4's actual matrix:
- The matrix specifies **three different regimes** based on where the item is in its lifecycle (before kitchen processing: free cancel; after prep started: needs approval; after payment: refund workflow, no delete). The old code applied **one flat rule** (`requireManagerApprovalForCancel`) regardless of whether the item was still `NEW` or already `PREPARING`.
- There was no payment-status check at all in `cancelItem()`.

**Fixed — preparation-phase awareness:** `cancelItem()` now derives the item's real phase from its linked `PreparationTicket.preparationStatus` (`OrderItem.status` itself is confirmed dead — see below — so it cannot be the signal). Phase is computed transiently at cancel time, **not persisted** (kept a minimal refactor, not a schema change — surfaced only in the `ORDER_ITEM_CANCELLED` event payload for any future consumer):

| Phase | Ticket state | Behavior |
|---|---|---|
| `NOT_SENT` | no ticket references the item | Free cancel, subject only to the existing brand-level settings (unchanged) |
| `SENT_PENDING` | `PENDING` / `CANCELLED` / `REJECTED` | Same as `NOT_SENT` — no completed kitchen work either way |
| `IN_PREPARATION` | `PREPARING` | **New:** manager approval always required, regardless of the brand toggle — real cost already committed |
| `READY` | `READY` | **New:** manager approval always required (not a block — `READY` can mean "waiting for pickup/serving," not "already delivered/unusable," per explicit correction during design) |

**Confirmed, newly-found gaps — documented, not built (infrastructure doesn't exist):**
- **`OrderItem.status`** (`NEW/SENT_TO_PRODUCTION/PREPARING/READY/DELIVERED/REJECTED`) **is dead** — confirmed by grep, nothing anywhere transitions it away from `NEW` except the cancel path itself. This is a second, independent instance of the "designed but dead" pattern already catalogued in §2.1, on the Order module's own core entity this time, not just its settings.
- **`Order.paymentStatus`** (`UNPAID/PARTIALLY_PAID/PAID/REFUNDED/CANCELLED`) **is also dead** — confirmed by grep across all of `server/modules/`: nothing anywhere ever writes it. It's listed in `order.repository.js`'s `lockedUpdateFields`, so it can't even be set via the generic PUT either. **`Invoice.status`** (`OPEN/PAID/PARTIALLY_RETURNED/FULLY_RETURNED/CANCELLED`) has the same problem — no code transitions it to `PAID`. **There is currently no live payment-state signal anywhere in this codebase.** A payment-status gate on cancellation was not added — a conditional on a field that can only ever read its default would be dead code by construction, not a real safeguard. This is a prerequisite gap: real payment tracking (something writing `Order.paymentStatus`/`Invoice.status` when a payment is actually recorded) needs to exist before §21.4's "after payment → refund workflow" regime can be implemented at all. **This gap was investigated in full as its own audit** — see [server/PAYMENT_LIFECYCLE_AUDIT.md](PAYMENT_LIFECYCLE_AUDIT.md) (2026-07-18): the entire sales-side payment-recording chain is unimplemented, not just these two fields, with a working Purchasing/AP precedent (`PurchaseInvoice.recordPayment()`) identified as the template for a fix.
- **No reusable-vs-perishable classification exists.** No field on `Product`, `Recipe`, or `StockItem` distinguishes a reusable/sealed item (bottled water, canned drink, unopened packaged dessert) from one that's non-reusable once prepared (a cooked burger, a customized pizza). No return-to-inventory or reassign-to-another-order mechanism exists either. This means the `IN_PREPARATION`/`READY` phases **cannot** automatically decide "return to stock" vs. "waste" vs. "reassign" — they stop at requiring manager approval and go no further. `inventory/waste-record` remains a separate, manually-approved module, intentionally **not** auto-invoked from cancellation.

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

1. ~~**Resolve the negative-stock duplicate (§2.2).**~~ **DONE (2026-07-17).** `OrderSettings.preventNegativeStockOrders` deleted; `InventorySettings.allowNegativeStock` is the correct single owner per §21.17's ownership table — Inventory Controller, not Order/Operations.
2. **Implement §21.3's Order Acceptance Decision** as a new `beforeTransition` check in `order.service.js`, reading new `OrderSettings` fields (e.g. `orderApprovalMode: AUTO|REQUIRE_APPROVAL|MANUAL_REVIEW`, `approvalThresholdAmount`) — requires a new `Order.status` value (`PENDING_APPROVAL`) and a transition-guard edge `OPEN -> PENDING_APPROVAL -> IN_PROGRESS`. This is a real state-machine change, not just a settings read — needs explicit sign-off on the new status before implementation, since it changes `Order`'s schema-level contract.
3. ~~**Make §21.4 cancellation state-aware.**~~ **DONE (2026-07-18)**, phase-awareness only — see §2.4. Payment-status gating remains blocked on a prerequisite gap (no live payment-state signal exists anywhere — `Order.paymentStatus`/`Invoice.status` are both dead) and was deliberately not built as a non-functional check. The refund flow itself is still fully out of scope (no refund engine exists in this module set).
4. **Decide the fate of the other 14 dead `OrderSettings` fields (§2.1).** Two of the three (hold orders, SLA timers) require infrastructure this platform doesn't have yet (a `HOLD` status; a scheduler — see the Backend Knowledge Base's confirmed-absent list). Recommend a explicit triage pass, not a silent bulk-delete: which are genuinely planned (keep, get a milestone), vs. speculative (delete).
5. **Wire `PreparationSectionConfig`'s four dead fields (§2.5) or remove them.** `requireConfirmationBeforeSend` and `autoAssignChef` are the two most implementable without new infrastructure — both are pure "check a flag before/during `createTicketsFromOrder`" changes.
6. **Subscribe something to `Order.Confirmed`** if the Chapter 21 vision (Order → ... → Loyalty → Notifications → Audit) is meant to happen automatically rather than manually — currently nothing does.

None of the above is implemented. Item 2 in particular is a schema change (new `Order.status` value) and needs explicit approval before touching `order.model.js`.

---

## 5. Required services (if the above is approved)

| Change | New/changed service surface |
|---|---|
| §21.3 Order Acceptance | `order.service.js`: new `beforeTransition` or pre-check inside `transition()`; possibly a new `orderApprovalService` if the rule set grows beyond a simple threshold check |
| §21.4 state-aware cancellation | ~~`order.service.js#cancelItem` — branch on `item.status`, add a payment-status guard.~~ **Done**, branched on the ticket's `preparationStatus` instead (the live signal — `item.status` is dead). Payment-status guard not built (see §2.4 — no live signal exists). No new service class needed. |
| Negative-stock dedup | `order-settings.model.js` schema edit only — no service change |
| Dead `PreparationSectionConfig` fields | `preparation-ticket.service.js#createTicketsFromOrder` — read `requireConfirmationBeforeSend`/`autoAssignChef` from the resolved section doc (already fetched at line 122) |

No new top-level module or domain is implied by anything found in this audit — every recommendation above is a change inside the five modules already in scope.

## 6. Required events

- `Order.PendingApproval` (new) — if §21.3 is implemented, needed to notify whoever approves.
- `Order.ApprovalGranted` / `Order.ApprovalRejected` (new) — same.
- Existing `Order.Confirmed` / `Order.ItemCancelled` need at least one real subscriber for the Chapter 21 flow to be more than a diagram — which subscriber (Notifications? Loyalty? Audit, beyond the existing `auditLogger` middleware which is HTTP-driven, not event-driven?) is a product decision, not an architecture one, and isn't decided by this audit.

## 7. Database relations touched by the recommendations above

- `Order.status` enum gains `PENDING_APPROVAL` (if §21.3 is approved) — additive, no migration needed for existing rows (they're never in that state).
- ~~`Order.items[].status` already has the granularity §21.4 needs~~ — **correction (2026-07-18):** this field looked sufficient but is confirmed dead (nothing transitions it). §21.4's phase-awareness was implemented against `PreparationTicket.preparationStatus` instead — no schema change was needed there either, only service logic re-pointed at the live field.
- ~~`OrderSettings` loses `preventNegativeStockOrders` (recommendation 1)~~ — **done**, field was confirmed dead, no data migration concern (removed an unread field, no existing document reads affected).
- No changes recommended to `PreparationTicket`, `PreparationSectionConfig`, `InventorySettings`, `Recipe`, `StockItem`, or any accounting model — the existing relationships (documented in the Architecture Deep Audit §04) are sufficient for everything in §4.

---

**Status: recommendations 1 and 3 of 6 implemented (2026-07-17, 2026-07-18).** Recommendations 2, 4, 5, 6 remain awaiting approval — no implementation on those has started. Per the operating instruction this document was produced under, further code changes resume only after explicit sign-off on which remaining item (and which sub-decisions — the new `Order.status` value for recommendation 2 in particular) to proceed with next.
