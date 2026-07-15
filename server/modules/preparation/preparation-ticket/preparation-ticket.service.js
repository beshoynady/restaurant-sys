import PreparationTicketModel from "./preparation-ticket.model.js";
import AdvancedService from "../../../utils/BaseRepository.js";
import throwError from "../../../utils/throwError.js";
import ProductModel from "../../menu/product/product.model.js";
import PreparationSectionModel from "../preparation-section/preparation-section.model.js";
import { expandOrderItems } from "../../sales/order/engines/order-item-expansion.js";

// PLATFORM_FINAL_AUDIT.md PA-07: preparationStatus/deliveryStatus were raw
// enum fields updated through the generic BaseController.update with no
// transition guard — any client could set any status from any status.
// Guarded here, mirroring the pattern already established for
// LeaveRequest/EmployeeAdvance in the HR domain.
const PREPARATION_STATUS_TRANSITIONS = {
  PENDING: ["PREPARING", "CANCELLED", "REJECTED"],
  PREPARING: ["READY", "CANCELLED", "REJECTED"],
  READY: [],
  CANCELLED: [],
  REJECTED: [],
};

const DELIVERY_STATUS_TRANSITIONS = {
  WAITING: ["READY_FOR_HANDOVER"],
  READY_FOR_HANDOVER: ["HANDED_OVER"],
  HANDED_OVER: [],
};

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

    if (data?.preparationStatus || data?.deliveryStatus) {
      const current = await this.model.findById(id).select("preparationStatus deliveryStatus brand").lean();
      if (!current) {
        throwError("Resource not found", 404);
      }

      const filter = { _id: id, brand: brandId };
      const setUpdate = {};

      if (data.preparationStatus && data.preparationStatus !== current.preparationStatus) {
        const allowed = PREPARATION_STATUS_TRANSITIONS[current.preparationStatus] || [];
        if (!allowed.includes(data.preparationStatus)) {
          throwError(`Invalid preparationStatus transition: ${current.preparationStatus} -> ${data.preparationStatus}`, 400);
        }
        filter.preparationStatus = current.preparationStatus;
        setUpdate.preparationStatus = data.preparationStatus;
      }

      if (data.deliveryStatus && data.deliveryStatus !== current.deliveryStatus) {
        const allowed = DELIVERY_STATUS_TRANSITIONS[current.deliveryStatus] || [];
        if (!allowed.includes(data.deliveryStatus)) {
          throwError(`Invalid deliveryStatus transition: ${current.deliveryStatus} -> ${data.deliveryStatus}`, 400);
        }
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
    // pre-existing PreparationTicketSettings.ticketSequence sub-doc uses an incompatible,
    // unread shape (confirmed: no code anywhere calls SequenceGeneratorService against it) and is
    // left as a named, separate cleanup rather than adopted here under this milestone's scope.
    let ticketNumber = await this.model.countDocuments({ order: order._id });

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
        deliveryPolicy: order.deliveryPolicy || "IMMEDIATE",
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

    const tickets = await this.model
      .find(filter)
      .populate("order", "orderNum orderType")
      .populate("preparationSection", "name stationType maxParallelTickets averagePreparationTime")
      .populate("items.product", "name")
      .populate("responsibleEmployee", "name")
      .sort({ receivedAt: 1 })
      .lean();

    return this._groupTicketsByStation(tickets);
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
  _groupTicketsByStation(tickets) {
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
      const slaBadge = isOverdue ? "overdue" : remainingMinutes <= 3 ? "warning" : "onTime";

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
