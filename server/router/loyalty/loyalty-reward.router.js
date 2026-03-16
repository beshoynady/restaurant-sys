import express from "express";
const router = express.Router();

import {
  createReward,
  getAllRewards,
  getReward,
  updateReward,
  deleteReward,
  getActiveRewards,
} from "../../controllers/loyalty/loyalty-reward.controller.js";

import { authenticateToken } from "../../middlewares/authenticate.js";

router.post("/", authenticateToken, createReward);
router.get("/", authenticateToken, getAllRewards);
router.get("/active", authenticateToken, getActiveRewards);
router.get("/:id", authenticateToken, getReward);
router.put("/:id", authenticateToken, updateReward);
router.delete("/:id", authenticateToken, deleteReward);

export default router;