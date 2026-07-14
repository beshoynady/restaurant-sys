import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import helmet from "helmet"; // Security middleware
import cookieParser from "cookie-parser";
import http from "http";
import path from "path";
import { initSocket } from "./socket/socket.js";
import notFound from "./middlewares/notFound.js";
import errorHandler from "./middlewares/errorHandler.js";
import auditLogger from "./middlewares/auditLogger.js";

import routerV1 from "./router/v1/index.router.js";
// Import database connection
import connectDB from "./database/connect-db.js";
import roleTemplateService from "./modules/iam/role-template/role-template.service.js";
import registerEventHandlers from "./utils/registerEventHandlers.js";


// Load environment variables
dotenv.config();

// Connect to MongoDB (awaited: the app must not accept traffic before the
// DB connection is established, otherwise early requests race an unready
// connection).
await connectDB();

// DEFAULT_ROLE_ARCHITECTURE.md §2 — idempotent upsert of the platform's shared, global role
// template catalog. Unlike tenant data (never auto-created), this is safe and correct to seed on
// every boot: it's a static, versioned, non-tenant-scoped catalog every brand reads from.
await roleTemplateService.ensureSeeded();

// V5.2 Replenishment Engine (and any future Domain Event subscriber) — must be wired before the
// app accepts traffic, so no emitted event can ever race an unregistered handler.
registerEventHandlers();

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
const allowedOrigins = ["http://localhost:5173", frontEnd];
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
// server.js is now the entry point (package.json "start" script updated to point here).
// server.ts, previously the actual entry point, has been removed as part of the project's
// move away from TypeScript — this file already existed as a parallel JS copy that had
// drifted slightly out of sync (was missing this trustProxy setting); merged and kept.
app.use("/api/v1", limiter);

// -------------------
// AUDIT LOGGER
// -------------------
app.use(auditLogger);

// -------------------
// ROUTES
// -------------------
app.use("/api/v1", routerV1);

// -------------------
// ERROR HANDLING
// -------------------
app.use(notFound);
app.use(errorHandler);

// -------------------
// HTTP SERVER
// -------------------
const server = http.createServer(app);
// Initialize Socket.IO with the HTTP server
initSocket(server); 
// -------------------
// START SERVER
// -------------------
const port = process.env.PORT || 8000;
server.listen(port, () => {
  console.log(
    `🚀 Server is running on port ${port} in ${process.env.NODE_ENV} mode`,
  );
});
