import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";

/** Initialize the Socket.IO server and its application namespaces. */
export const initSocket = (server: HttpServer) => {
  const allowedOrigins = [
    "https://restaurant.menufy.tech",
    process.env.FRONT_END_URL,
  ].filter((origin): origin is string => Boolean(origin));

  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  const cashierNamespace = io.of("/cashier");
  const waiterNamespace = io.of("/waiter");
  const kitchenNamespace = io.of("/kitchen");
  const barNamespace = io.of("/bar");
  const grillNamespace = io.of("/grill");

  cashierNamespace.on("connection", (socket) => {
    socket.on("neworder", (data) => cashierNamespace.emit("neworder", data));
  });

  kitchenNamespace.on("connection", (socket) => {
    socket.on("orderkitchen", (data) =>
      kitchenNamespace.emit("orderkitchen", data),
    );
  });

  barNamespace.on("connection", (socket) => {
    socket.on("orderBar", (data) => barNamespace.emit("orderBar", data));
  });

  grillNamespace.on("connection", (socket) => {
    socket.on("orderGrill", (data) => grillNamespace.emit("orderGrill", data));
  });

  waiterNamespace.on("connection", (socket) => {
    socket.on("orderReady", (data) => waiterNamespace.emit("orderReady", data));
    socket.on("helprequest", (data) =>
      waiterNamespace.emit("helprequest", data),
    );
    socket.on("orderwaiter", (data) =>
      waiterNamespace.emit("orderwaiter", data),
    );
  });

  return io;
};
