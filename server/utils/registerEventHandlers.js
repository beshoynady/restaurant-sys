import domainEvents, { DomainEvent } from "./domainEvents.js";
import replenishmentEngine from "../modules/inventory/replenishment/replenishment.service.js";

/**
 * V5.2 — single wiring point for every Domain Event subscriber in the platform. Before this file,
 * `domainEvents.js` had two live publishers and zero subscribers (confirmed during the V5.2
 * audit); called once at boot from server.js, after the DB connection is established and before
 * the app starts accepting traffic, so no event can ever be emitted before its handlers exist.
 *
 * Additive-only, same convention as the `DomainEvent` catalog itself: a new subscriber is added
 * here in the same change that ships it, never pre-wired for an engine that doesn't exist yet.
 */
export default function registerEventHandlers() {
  domainEvents.on(DomainEvent.INVENTORY_BELOW_REORDER_POINT, (payload) =>
    replenishmentEngine.handleBelowReorderPoint(payload),
  );
}
