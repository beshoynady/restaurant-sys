import express from "express";
import { authenticateToken } from "../../middlewares/authenticate.js";

import {
  createTable,
  updateTable,
  getAllTables,
  getTableById,
  deleteTable,
  generateTableQR,
  changeTableStatus,
  searchTables,
  getTablesByDiningArea,
  getTablesByBranch,
  createMultipleTables,
  createTableCode,
  getTableByCode,
} from "../../controllers/seating/table.controller.js";

const router = express.Router();

/* ===============================
   Table Routes
================================ */

/**
 * @route   POST /
 * @desc    Create a new table
 * @access  Private
 */
router.post("/", authenticateToken, createTable);

/**
 * @route   GET /
 * @desc    Get all tables
 * @access  Public
 */
router.get("/", getAllTables);

/**
 * @route   GET /search
 * @desc    Search tables
 * @access  Public
 */
router.get("/search", searchTables);

/**
 * @route   POST /bulk
 * @desc    Create multiple tables
 * @access  Private
 */
router.post("/bulk", authenticateToken, createMultipleTables);

/**
 * @route   POST /qr
 * @desc    Generate QR code for a table
 * @access  Private
 */
router.post("/qr", authenticateToken, generateTableQR);

/**
 * @route   POST /code
 * @desc    Create table code
 * @access  Private
 */
router.post("/code", authenticateToken, createTableCode);

/**
 * @route   GET /code/:code
 * @desc    Get table by code
 * @access  Public
 */
router.get("/code/:code", getTableByCode);

/**
 * @route   GET /dining-area/:diningAreaId
 * @desc    Get tables by dining area
 * @access  Public
 */
router.get("/dining-area/:diningAreaId", getTablesByDiningArea);

/**
 * @route   GET /branch/:branchId
 * @desc    Get tables by branch
 * @access  Public
 */
router.get("/branch/:branchId", getTablesByBranch);

/**
 * @route   PATCH /:tableId/status
 * @desc    Change table status
 * @access  Private
 */
router.patch("/:tableId/status", authenticateToken, changeTableStatus);

/**
 * @route   GET /:tableId
 * @desc    Get table by id
 * @access  Public
 */
router.get("/:tableId", getTableById);

/**
 * @route   PUT /:tableId
 * @desc    Update table
 * @access  Private
 */
router.put("/:tableId", authenticateToken, updateTable);

/**
 * @route   DELETE /:tableId
 * @desc    Delete table
 * @access  Private
 */
router.delete("/:tableId", authenticateToken, deleteTable);

export default router;