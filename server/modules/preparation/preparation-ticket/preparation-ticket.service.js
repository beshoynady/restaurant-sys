import PreparationTicketModel from "./preparation-ticket.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";
import ProductModel from "../../menu/product/product.model.js";
import PreparationSectionModel from "../preparation-section/preparation-section.model.js";
import { expandOrderItems } from "../../sales/order/order-item-expansion.js";
import recipeConsumptionService from "../../inventory/recipe-consumption/recipe-consumption.service.js";
import inventorySettingsService from "../../inventory/inventory-settings/inventory-settings.service.js";
import preparationSettingsService from "../preparation-settings/preparation-settings.service.js";
import { createTransitionGuard } from "../../../utils/TransitionGuard.js";

// PLATFORM_FINAL_AUDIT.md PA-07: preparationStatus/deliveryStatus were raw
// enum fields updated through the generic BaseController.update with no
// transition guard — any client could set any status from any status.
// PREPARATION_DOMAIN_ARCHITECTURE_REVIEW.md "Eighth Objective"/"Recommended Architecture" #3: now
// built on the platform's shared createTransitionGuard() utility (already used by
// waste-record.service.js/purchase-return.service.js) instead of a hand-rolled inline map — same
// states/transitions as before, just no longer a duplicate reimplementation of the same guard.
// Note the one observable, intentional side effect: an invalid transition now
// responds 409 (TransitionGuard's own convention, matching every other module that already uses
// it) instead of this file's previous ad hoc 400 — standardizing to the platform norm, not a new rule.
const preparationStatusGuard = createTransitionGuard({
  PENDING: ["PREPARING", "CANCELLED", "REJECTED"],
  PREPARING: ["READY", "CANCELLED", "REJECTED"],
  READY: [],
  CANCELLED: [],
  REJECTED: [],
});

const deliveryStatusGuard = createTransitionGuard({
  WAITING: ["READY_FOR_HANDOVER"],
  READY_FOR_HANDOVER: ["HANDED_OVER"],
  HANDED_OVER: [],
});

class PreparationTicketService extends AdvancedService {
  constructor() {
    super(PreparationTicketModel, {
      brandScoped: true,
      // PLATFORM_FINAL_AUDIT.md PA-07, corrected: transactional execution
      // record with its own preparationStatus/deliveryStatus lifecycle
      // (guarded in update() below) — soft-delete does not apply.
      enableSoftDelete: false,
      defaultPopulate: ["brand", "branch", "order", "preparationSection", "responsibleEmployee", "waiter", "createdBy", "updatedBy"],
      // Enterprise Production Platform: fixed the same silently-ignored option-name typo
      // (searchFields -> searchableFields) already found and fixed on several sibling modules.
      searchableFields: [],
      defaultSort: { createdAt: -1 },
    });
  }

  async update(opts) {
    const { id, brandId, data } = opts;

    const touchesStatus = Boolean(data?.preparationStatus || data?.deliveryStatus);
    // PreparationSettings.ticket.allowEditAfterSent gate (below) needs to see any attempt to edit
    // ticket contents, not just status changes — `items` is the field that gate actually protects.
    const touchesItems = data?.items !== undefined;

    if (touchesStatus || touchesItems) {
      const current = await this.model.findById(id).select("preparationStatus deliveryStatus brand branch").lean();
      if (!current) {
        throwError("Resource not found", 404);
      }

      // PREPARATION_DOMAIN_ARCHITECTURE_REVIEW.md "Sixth Objective"/"Recommended Architecture":
      // PreparationTicket now consumes the unified PreparationSettings document instead of the
      // (unread) PreparationTicketSettings/PreparationSectionConfig-embedded fields it never
      // actually read before.
      const settings = await preparationSettingsService.resolveForBranch(current.brand, current.branch, opts.updatedBy);

      if (touchesItems && current.preparationStatus !== "PENDING" && settings.ticket?.allowEditAfterSent === false) {
        throwError(
          "This ticket has already been sent to the kitchen — its items can no longer be edited (PreparationSettings.ticket.allowEditAfterSent is disabled for this brand/branch).",
          409,
        );
      }

      const filter = { _id: id, brand: brandId };
      const setUpdate = {};

      if (data.preparationStatus && data.preparationStatus !== current.preparationStatus) {
        preparationStatusGuard.assertValid(current.preparationStatus, data.preparationStatus);
        if (data.preparationStatus === "REJECTED" && settings.ticket?.allowRejectTicket === false) {
          throwError(
            "Rejecting a ticket is disabled for this brand/branch (PreparationSettings.ticket.allowRejectTicket).",
            403,
          );
        }
        filter.preparationStatus = current.preparationStatus;
        setUpdate.preparationStatus = data.preparationStatus;
      }

      if (data.deliveryStatus && data.deliveryStatus !== current.deliveryStatus) {
        deliveryStatusGuard.assertValid(current.deliveryStatus, data.deliveryStatus);
        filter.deliveryStatus = current.deliveryStatus;
        setUpdate.deliveryStatus = data.deliveryStatus;
      }

      // Atomic claim — closes the same TOCTOU race already fixed on every posting-adjacent
      // transition in this platform: the previous read-then-call-super.update() pattern let two
      // concurrent status changes both pass validation against the same stale "current" status
      // before either write landed.
      if (Object.keys(setUpdate).length > 0) {
        const claimed = await this.model.findOneAndUpdate(filter, { $set: setUpdate }, { new: true });
        if (!claimed) {
          throwError("This ticket's status was already changed by a concurrent request.", 409);
        }

        // Business Decision Matrix §21.5 (Kitchen Workflow Decision Matrix) — the per-station
        // recipe-consumption trigger points. Best-effort/non-blocking, matching every other
        // event-triggered side effect in this platform's established philosophy: a misconfigured
        // recipe/warehouse must not prevent the status transition that already, correctly,
        // committed. Only fires when the brand's configured `inventoryDeductionTrigger` matches
        // the transition that just landed — ON_ORDER_CONFIRM fires instead from
        // order.service.js#transition, and MANUAL_ONLY fires from neither call site.
        const startedPrep = setUpdate.preparationStatus === "PREPARING" && current.preparationStatus === "PENDING";
        const finishedPrep = setUpdate.preparationStatus === "READY" && current.preparationStatus === "PREPARING";
        const handedOver = setUpdate.deliveryStatus === "HANDED_OVER" && current.deliveryStatus === "READY_FOR_HANDOVER";

        if (startedPrep || finishedPrep || handedOver) {
          try {
            const inventorySettings = await inventorySettingsService.resolveForPosting(current.brand, current.branch);
            const trigger = inventorySettings.inventoryDeductionTrigger || "ON_ORDER_CONFIRM";
            const shouldConsume =
              (startedPrep && trigger === "ON_PREP_START") ||
              (finishedPrep && trigger === "ON_PREP_END") ||
              (handedOver && trigger === "ON_DELIVERY");
            if (shouldConsume) {
              await recipeConsumptionService.consumeForTicket({ ticket: claimed, actorId: opts.updatedBy });
            }
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error(`[preparation-ticket.service] Recipe consumption not posted for ticket ${id}: ${err.message}`);
          }
        }
      }
    }

    return super.update(opts);
  }

  /**
   * Auto-ticket-creation from Order — the single most consequential kitchen gap named across
   * every audit this engagement produced for this domain (`ARCHITECTURE_REVIEW.md`,
   * `MENU_PRODUCTION_PLATFORM_AUDIT.md`, `KITCHEN_EXECUTION_ARCHITECTURE.md`): the ticket schema
   * and per-section splitting (the model's own unique `{order, ticketNumber}` index) were always
   * real, but nothing ever actually created a ticket from a confirmed order. Groups the order's
   * items by their Product's own `preparationSection` (already the established single-section-
   * per-product routing, per `MENU_PLATFORM_FINAL_ARCHITECTURE.md` §6.2) and creates exactly one
   * ticket per distinct section — never one ticket per item, never one ticket for the whole order.
   */
  async createTicketsFromOrder({ order, actorId }) {
    if (!order.items || order.items.length === 0) return [];

    // Combo Execution: a combo order item expands into its own resolved components (each
    // carrying its own product/quantity), so each component routes to ITS OWN section — a combo
    // container itself has no recipe/section of its own and must never be ticketed as if it were
    // a single directly-prepared item.
    const resolvedItems = expandOrderItems(order);

    const productIds = [...new Set(resolvedItems.map((item) => String(item.product)))];
    const products = await ProductModel.find({ _id: { $in: productIds } }).select("preparationSection").lean();
    const sectionByProduct = Object.fromEntries(products.map((p) => [String(p._id), p.preparationSection ? String(p.preparationSection) : null]));

    const itemsBySection = {};
    for (const item of resolvedItems) {
      const sectionId = sectionByProduct[String(item.product)];
      if (!sectionId) continue; // a service-type item with no kitchen routing produces no ticket
      itemsBySection[sectionId] = itemsBySection[sectionId] || [];
      itemsBySection[sectionId].push(item);
    }

    const sectionIds = Object.keys(itemsBySection);
    if (sectionIds.length === 0) return [];

    const sections = await PreparationSectionModel.find({ _id: { $in: sectionIds } }).select("averagePreparationTime").lean();
    const sectionById = Object.fromEntries(sections.map((s) => [String(s._id), s]));

    // ticketNumber is scoped per-order (the model's own unique index is {order, ticketNumber}, not
    // brand-wide) — a simple per-order counter, not a SequenceGeneratorService sequence; the
    // legacy PreparationTicketSettings.ticketSequence sub-doc (now migrated into
    // PreparationSettings.ticket.ticketSequence, see preparation-settings.service.js) uses an
    // incompatible, still-unread shape and remains a named, separate cleanup, not adopted here.
    let ticketNumber = await this.model.countDocuments({ order: order._id });

    // PreparationSettings.ticket.deliveryPolicy is only the FALLBACK default when the order itself
    // doesn't specify one — Order's own value always wins when present, unchanged from before.
    const settings = await preparationSettingsService.resolveForBranch(order.brand, order.branch, actorId);
    const deliveryPolicyDefault = settings.ticket?.deliveryPolicy || "IMMEDIATE";

    const now = new Date();
    const tickets = [];
    for (const sectionId of sectionIds) {
      ticketNumber += 1;
      const section = sectionById[sectionId];
      const prepMinutes = section?.averagePreparationTime ?? 10;

      const ticket = await this.model.create({
        brand: order.brand,
        branch: order.branch,
        ticketNumber,
        order: order._id,
        preparationSection: sectionId,
        deliveryPolicy: order.deliveryPolicy || deliveryPolicyDefault,
        items: itemsBySection[sectionId].map((item) => ({
          orderItemId: item.orderItemId,
          product: item.product,
          quantity: item.quantity,
          notes: item.notes,
          extras: (item.extras || []).map((e) => ({ extra: e.extra, quantity: e.quantity })),
          selectedModifiers: (item.selectedModifiers || []).map((m) => ({ product: m.product, quantity: m.quantity })),
        })),
        receivedAt: now,
        expectedReadyAt: new Date(now.getTime() + prepMinutes * 60000),
        createdBy: actorId,
      });
      tickets.push(ticket);
    }

    return tickets;
  }

  /**
   * Kitchen Queue — the live, per-station operational view named as the top open gap in
   * `PREPARATION_KITCHEN_OPERATIONS_STATUS.md` Addendum 4 §10.3 (real tickets have existed since
   * Addendum 2; nothing until now read them back in a station-grouped, frontend-ready shape). Every
   * calculated field a kitchen-display screen needs (elapsed time, SLA badge, station utilization)
   * is computed here, server-side — per this platform's "no frontend should calculate business
   * logic" rule — not left for a client to derive from raw `receivedAt`/`expectedReadyAt` timestamps.
   * Deliberately scoped to the LIVE queue only (active, non-terminal tickets): historical
   * performance/analytics (chef performance, station throughput over time) is separate, unbuilt
   * Kitchen Analytics work, not fabricated here.
   */
  async getKitchenQueue({ brandId, branchId, section }) {
    const filter = { brand: brandId, preparationStatus: { $in: ["PENDING", "PREPARING", "READY"] } };
    if (branchId) filter.branch = branchId;
    if (section) filter.preparationSection = section;

    const [tickets, settings] = await Promise.all([
      this.model
        .find(filter)
        .populate("order", "orderNum orderType")
        .populate("preparationSection", "name stationType maxParallelTickets averagePreparationTime")
        .populate("items.product", "name")
        .populate("responsibleEmployee", "name")
        .sort({ receivedAt: 1 })
        .lean(),
      // PreparationSettings.sla.warningThresholdMinutes replaces the hardcoded 3-minute value the
      // SLA badge used to use — see _groupTicketsByStation below.
      preparationSettingsService.resolveForBranch(brandId, branchId),
    ]);

    const warningThresholdMinutes = settings.sla?.warningThresholdMinutes ?? 3;
    return this._groupTicketsByStation(tickets, warningThresholdMinutes);
  }

  /** Dashboard summary — per-station live counts/utilization, for dashboard-card style widgets. */
  async getKitchenDashboard({ brandId, branchId }) {
    const stations = await this.getKitchenQueue({ brandId, branchId });

    let totalActive = 0;
    let totalOverdue = 0;
    const statusTotals = { PENDING: 0, PREPARING: 0, READY: 0 };

    const stationCards = stations.map((station) => {
      totalActive += station.activeTicketCount;
      totalOverdue += station.overdueCount;
      for (const ticket of station.tickets) statusTotals[ticket.preparationStatus] += 1;

      return {
        sectionId: station.sectionId,
        sectionName: station.sectionName,
        stationType: station.stationType,
        activeTicketCount: station.activeTicketCount,
        overdueCount: station.overdueCount,
        utilizationPercent: station.utilizationPercent,
      };
    });

    return {
      totals: { activeTickets: totalActive, overdueTickets: totalOverdue, ...statusTotals },
      stations: stationCards,
    };
  }

  /**
   * Groups a flat ticket list into per-station cards, computing per-ticket SLA/elapsed fields and
   * per-station utilization (`activeTicketCount / maxParallelTickets`, the capacity field
   * `PreparationSectionConfig` already carries but nothing previously read). Shared by both the
   * queue and the dashboard so the two views can never silently disagree on what "overdue" means.
   */
  _groupTicketsByStation(tickets, warningThresholdMinutes = 3) {
    const now = Date.now();
    const byStation = new Map();

    for (const ticket of tickets) {
      const sectionDoc = ticket.preparationSection;
      const sectionId = sectionDoc?._id ? String(sectionDoc._id) : String(ticket.preparationSection);

      if (!byStation.has(sectionId)) {
        byStation.set(sectionId, {
          sectionId,
          // .lean() serializes Map fields to plain objects already (not Map instances) — only
          // wrap with Object.fromEntries when populate() returned a hydrated document instead.
          sectionName: sectionDoc?.name ? (sectionDoc.name instanceof Map ? Object.fromEntries(sectionDoc.name) : sectionDoc.name) : null,
          stationType: sectionDoc?.stationType || "other",
          maxParallelTickets: sectionDoc?.maxParallelTickets ?? null,
          activeTicketCount: 0,
          overdueCount: 0,
          tickets: [],
        });
      }

      const station = byStation.get(sectionId);
      const receivedAt = new Date(ticket.receivedAt).getTime();
      const expectedReadyAt = new Date(ticket.expectedReadyAt).getTime();
      const elapsedMinutes = Math.round((now - receivedAt) / 60000);
      const remainingMinutes = Math.round((expectedReadyAt - now) / 60000);
      const isOverdue = ticket.preparationStatus !== "READY" && now > expectedReadyAt;
      const slaBadge = isOverdue ? "overdue" : remainingMinutes <= warningThresholdMinutes ? "warning" : "onTime";

      station.activeTicketCount += 1;
      if (isOverdue) station.overdueCount += 1;

      station.tickets.push({
        ...ticket,
        elapsedMinutes,
        remainingMinutes,
        isOverdue,
        slaBadge,
      });
    }

    const result = [...byStation.values()];
    for (const station of result) {
      station.utilizationPercent = station.maxParallelTickets
        ? Math.round((station.activeTicketCount / station.maxParallelTickets) * 100)
        : null;
      // Overdue tickets surface first, then oldest-received first within the same urgency band.
      station.tickets.sort((a, b) => (b.isOverdue - a.isOverdue) || (new Date(a.receivedAt) - new Date(b.receivedAt)));
    }
    return result;
  }
}

export default new PreparationTicketService();
