import express from "express";
const router = express.Router();
import {
  createStore,
  getAllStores,
  getStoreById,
  updateStore,
  deleteStore,
} from "../../controllers/inventory/inventory.controller.js";

import { authenticateToken } from "../../middlewares/authenticate.js";


// Create a new store
router
  .route("/")
  .post(authenticateToken,createStore)
  .get(authenticateToken,getAllStores);

// Get a store by ID
router
  .route("/:id")
  .get(authenticateToken,getStoreById)
  .put(authenticateToken,updateStore)
  .delete(authenticateToken,deleteStore);

export default router;
