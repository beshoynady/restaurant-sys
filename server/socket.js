import { Server } from "socket.io";

/**
 * Initialize Socket.IO server
 * @param {http.Server} server
 */
export const initSocket = (server) => {
  const allowedOrigins = [
    "https://restaurant.menufy.tech",
    process.env.FRONT_END_URL,
  ];

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