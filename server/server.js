import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import helmet from "helmet"; // Security middleware
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";
import notFound from "./middlewares/notFound.js";
import errorHandler from "./middlewares/errorHandler.js";

import router from "./router/index.js";
// Import database connection
import connectdb from "./database/connectdb.js";


// Load environment variables
dotenv.config();

// Connect to MongoDB
connectdb();

const app = express();
const frontEnd = process.env.FRONT_END_URL;

// -------------------
// SECURITY MIDDLEWARE
// -------------------
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  }),
);

// -------------------
// MIDDLEWARE SETUP
// -------------------
app.use(express.json({ limit: "100kb" })); // Limit request body size
app.use(cookieParser()); // Parse cookies

// -------------------
// CORS CONFIG
// -------------------
const allowedOrigins = ["https://restaurant.menufy.tech", frontEnd];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, origin);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// -------------------
// STATIC FILES
// -------------------
app.use("/", express.static("public"));
app.use("/images", express.static("images"));

// -------------------
// TEST ENDPOINT
// -------------------
app.get("/", (req, res) => res.send("Welcome to the server!"));

// -------------------
// RATE LIMITING
// -------------------
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 100, // max 100 requests per minute
  standardHeaders: "draft-7",
  legacyHeaders: false,
  trustProxy: false,
});
app.use("/api", limiter);

// -------------------
// ROUTES
// -------------------
app.use("/api", router);

// -------------------
// ERROR HANDLING
// -------------------
app.use(notFound);
app.use(errorHandler);

// -------------------
// HTTP SERVER
// -------------------
const server = http.createServer(app);

// -------------------
// SOCKET.IO SETUP
// -------------------
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"], credentials: true },
});

// Namespaces
const cashierNamespace = io.of("/cashier");
const waiterNamespace = io.of("/waiter");
// production section namespaces for order notifications
const kitchenNamespace = io.of("/kitchen");
const barNamespace = io.of("/bar");
const grillNamespace = io.of("/grill");
// Cashier connections
cashierNamespace.on("connection", (socket) => {
  socket.on("neworder", (notification) =>
    cashierNamespace.emit("neworder", notification),
  );
  socket.on("disconnect", () => {});
});

// Kitchen connections
kitchenNamespace.on("connection", (socket) => {
  socket.on("orderkitchen", (notification) =>
    kitchenNamespace.emit("orderkitchen", notification),
  );
  socket.on("disconnect", () => {});
});

// Bar connections
barNamespace.on("connection", (socket) => {
  socket.on("orderBar", (notification) =>
    barNamespace.emit("orderBar", notification),
  );
  socket.on("disconnect", () => {});
});

// Grill connections
grillNamespace.on("connection", (socket) => {
  socket.on("orderGrill", (notification) =>
    grillNamespace.emit("orderGrill", notification),
  );
  socket.on("disconnect", () => {});
});

// Waiter connections
waiterNamespace.on("connection", (socket) => {
  socket.on("orderReady", (notification) =>
    waiterNamespace.emit("orderReady", notification),
  );
  socket.on("helprequest", (notification) =>
    waiterNamespace.emit("helprequest", notification),
  );
  socket.on("orderwaiter", (notification) =>
    waiterNamespace.emit("orderwaiter", notification),
  );
  socket.on("disconnect", () => {});
});

// -------------------
// START SERVER
// -------------------
const port = process.env.PORT || 8000;
server.listen(port, () => {
  console.log(
    `🚀 Server is running on port ${port} in ${process.env.NODE_ENV} mode`,
  );
});
