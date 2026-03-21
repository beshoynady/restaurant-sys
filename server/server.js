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
