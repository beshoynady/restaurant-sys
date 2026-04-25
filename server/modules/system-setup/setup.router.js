import express from "express";
import { initializeSystem } from "./setup.controller.js";

const router = express.Router();

/**
 * 🚀 System Setup Route
 * ---------------------
 * This endpoint runs ONLY once in system lifetime.
 * It initializes:
 * - Brand
 * - Main Branch
 * - Owner Role
 * - Owner User
 */
router.post("/initialize", initializeSystem);

export default router;