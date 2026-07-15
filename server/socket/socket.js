import { Server } from "socket.io";

/**
 * Initialize Socket.IO server
 * @param {http.Server} server
 *
 * IMPORTANT (confirmed by direct read, 2026-07-15 architecture review): every namespace below is a
 * pure client-echo relay — it re-broadcasts whatever payload a connected client happens to emit,
 * under whatever event name that client chose. NONE of it is wired to the real domain model.
 * `preparation-ticket.service.js` (the actual PreparationTicket lifecycle — the real KDS source of
 * truth) never emits into any of these namespaces, so a Kitchen Display connected to `/kitchen`
 * gets nothing from an order actually being confirmed/prepared/ready — only whatever another
 * connected client independently chooses to send it. Do not read this file as evidence that
 * real-time KDS push exists; it doesn't yet. Building that is a scoped feature (wire
 * `domainEvents`/ticket-status transitions into these namespaces, or replace this relay pattern
 * entirely) tracked in server/ULTRA_ARCHITECTURE_REVIEW_2026-07-15.md's roadmap — not a rename or
 * cleanup of this file. Left as-is (not deleted) because the `/cashier`/`/waiter` namespaces are
 * live, mounted infrastructure that a current frontend may already depend on for client-to-client
 * relay, independent of the kitchen-domain-wiring gap.
 */
export const initSocket = (server) => {
  const allowedOrigins = [
    "https://restaurant.menufy.tech",
    process.env.FRONT_END_URL,
  ].filter(Boolean);

  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // -------------------
  // Namespaces
  // -------------------
  const cashierNamespace = io.of("/cashier");
  const waiterNamespace = io.of("/waiter");

  const kitchenNamespace = io.of("/kitchen");
  const barNamespace = io.of("/bar");
  const grillNamespace = io.of("/grill");

  // -------------------
  // Cashier
  // -------------------
  cashierNamespace.on("connection", (socket) => {
    socket.on("neworder", (data) => {
      cashierNamespace.emit("neworder", data);
    });
  });

  // -------------------
  // Kitchen
  // -------------------
  kitchenNamespace.on("connection", (socket) => {
    socket.on("orderkitchen", (data) => {
      kitchenNamespace.emit("orderkitchen", data);
    });
  });

  // -------------------
  // Bar
  // -------------------
  barNamespace.on("connection", (socket) => {
    socket.on("orderBar", (data) => {
      barNamespace.emit("orderBar", data);
    });
  });

  // -------------------
  // Grill
  // -------------------
  grillNamespace.on("connection", (socket) => {
    socket.on("orderGrill", (data) => {
      grillNamespace.emit("orderGrill", data);
    });
  });

  // -------------------
  // Waiter
  // -------------------
  waiterNamespace.on("connection", (socket) => {
    socket.on("orderReady", (data) => {
      waiterNamespace.emit("orderReady", data);
    });

    socket.on("helprequest", (data) => {
      waiterNamespace.emit("helprequest", data);
    });

    socket.on("orderwaiter", (data) => {
      waiterNamespace.emit("orderwaiter", data);
    });
  });

  return io;
};