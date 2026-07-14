import { EventEmitter } from "events";

/**
 * Domain Event Dispatcher — SUPPLY_CHAIN_COMMERCE_ARCHITECTURE_V2.md §4.
 *
 * A minimal, in-process pub/sub. Deliberately NOT a message queue (RabbitMQ/Kafka/etc.) — this
 * platform is a single Node process, and that infrastructure decision (deployment topology,
 * delivery guarantees, dead-letter handling) isn't justified by anything in this domain today.
 * Naming events now, instead of scattering direct service-to-service calls, is what makes
 * swapping this dispatcher for a real queue later a one-file change instead of a rewrite.
 *
 * Error semantics: `emit()` awaits every handler SEQUENTIALLY (not `Promise.all` — handlers
 * commonly share a Mongoose transaction session passed in the payload, and concurrent operations
 * against one ClientSession are a driver-level error, same reasoning already applied in
 * onboarding-engine.service.js's settings-provisioning fix) and PROPAGATES the first error. This
 * dispatcher does not impose a blanket "swallow everything" policy — not every domain event is a
 * best-effort side effect (e.g. a GoodsReceipt confirmation posting its WarehouseDocument IS the
 * core business effect of that action, not a notification). A handler that wants best-effort,
 * non-blocking semantics (matching the existing Invoice -> JournalEntry posting pattern in
 * invoice.service.ts) must catch its own errors internally, exactly as that code already does —
 * this dispatcher provides the raw mechanism, each listener decides its own error tolerance.
 */
class DomainEventDispatcher {
  constructor() {
    this._emitter = new EventEmitter();
    // Generous ceiling — many independent domains are expected to subscribe to the same event
    // (e.g. StockItem.BelowThreshold eventually feeding both a notification and the Reorder
    // Engine) without that being mistaken for a leak.
    this._emitter.setMaxListeners(50);
  }

  on(eventName, handler) {
    this._emitter.on(eventName, handler);
    return () => this._emitter.off(eventName, handler);
  }

  off(eventName, handler) {
    this._emitter.off(eventName, handler);
  }

  async emit(eventName, payload) {
    const handlers = this._emitter.listeners(eventName);
    for (const handler of handlers) {
      await handler(payload);
    }
  }

  listenerCount(eventName) {
    return this._emitter.listenerCount(eventName);
  }
}

export default new DomainEventDispatcher();

/**
 * Canonical event-name catalog (SUPPLY_CHAIN_COMMERCE_ARCHITECTURE_V2.md §4/§8) — every
 * publisher/subscriber should reference a constant from here rather than an inline string
 * literal, so a typo'd event name fails at import time (an undefined export), not silently at
 * runtime with zero listeners ever firing. Additive-only, same convention already established for
 * RESOURCE_ENUM: a new entry is added in the same change that ships its first real publisher —
 * deliberately empty until then, not pre-populated with names for engines that don't exist yet.
 */
export const DomainEvent = Object.freeze({
  PURCHASE_ORDER_APPROVED: "PurchaseOrder.Approved",
  GOODS_RECEIPT_CONFIRMED: "GoodsReceipt.Confirmed",
});
