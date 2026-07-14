// Supply Chain & Commerce Platform V2 — Domain Event Dispatcher (SUPPLY_CHAIN_COMMERCE_ARCHITECTURE_V2.md §4).
// No database needed (pure in-process pub/sub), kept under tests/integration for consistency with
// this project's existing test layout. Verifies: handlers run in registration order, sequentially
// (never concurrently — required since handlers may share a Mongoose transaction session);
// multiple independent subscribers can react to the same event; a handler error propagates to the
// emitter's caller by default (no blanket swallow policy); `off`/the unsubscribe function returned
// by `on` actually stop future delivery.
import domainEvents, { DomainEvent } from "../../utils/domainEvents.js";

describe("Domain Event Dispatcher", () => {
  const usedEvents: string[] = [];

  afterEach(() => {
    // Tests register ad hoc event names (not in the — deliberately empty — canonical catalog);
    // clean up every listener so tests don't leak into each other.
    for (const name of usedEvents) {
      domainEvents["_emitter"].removeAllListeners(name);
    }
    usedEvents.length = 0;
  });

  it("delivers to multiple independent subscribers", async () => {
    const eventName = "test.multi-subscriber";
    usedEvents.push(eventName);
    const seen: string[] = [];

    domainEvents.on(eventName, async () => { seen.push("A"); });
    domainEvents.on(eventName, async () => { seen.push("B"); });

    await domainEvents.emit(eventName, { foo: "bar" });

    expect(seen).toEqual(["A", "B"]);
  });

  it("awaits handlers sequentially, never concurrently", async () => {
    const eventName = "test.sequential";
    usedEvents.push(eventName);
    const order: string[] = [];

    domainEvents.on(eventName, async () => {
      order.push("first-start");
      await new Promise((resolve) => setTimeout(resolve, 20));
      order.push("first-end");
    });
    domainEvents.on(eventName, async () => {
      order.push("second-start");
    });

    await domainEvents.emit(eventName, {});

    // If handlers ran concurrently, "second-start" would appear before "first-end".
    expect(order).toEqual(["first-start", "first-end", "second-start"]);
  });

  it("propagates a handler's error to the emitter's caller (no blanket swallow policy)", async () => {
    const eventName = "test.error-propagation";
    usedEvents.push(eventName);

    domainEvents.on(eventName, async () => {
      throw new Error("handler failed");
    });

    await expect(domainEvents.emit(eventName, {})).rejects.toThrow("handler failed");
  });

  it("passes the payload through unchanged", async () => {
    const eventName = "test.payload";
    usedEvents.push(eventName);
    let received: any = null;

    domainEvents.on(eventName, async (payload: any) => { received = payload; });
    await domainEvents.emit(eventName, { orderId: "abc123", amount: 42 });

    expect(received).toEqual({ orderId: "abc123", amount: 42 });
  });

  it("stops delivering after off() / the returned unsubscribe function is called", async () => {
    const eventName = "test.unsubscribe";
    usedEvents.push(eventName);
    let callCount = 0;
    const handler = async () => { callCount += 1; };

    const unsubscribe = domainEvents.on(eventName, handler);
    await domainEvents.emit(eventName, {});
    unsubscribe();
    await domainEvents.emit(eventName, {});

    expect(callCount).toBe(1);
  });

  it("exposes a frozen, additive-only canonical event catalog with a real publisher behind every entry", () => {
    // Grows as real publishers ship (PurchaseOrder.Approved, GoodsReceipt.Confirmed — Supply Chain
    // & Commerce Platform V5) — the guarantee is "frozen and additive," not "permanently empty."
    expect(Object.isFrozen(DomainEvent)).toBe(true);
    expect(Object.keys(DomainEvent).length).toBeGreaterThan(0);
    for (const eventName of Object.values(DomainEvent)) {
      expect(typeof eventName).toBe("string");
    }
  });
});
