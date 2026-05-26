import express from "express";
import setupController from "./setup.controller.js";

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
router.post("/initialize", setupController.initialize);

export default router;